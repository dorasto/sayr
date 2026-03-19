import fs from "node:fs/promises";
import path from "node:path";
import Redis from "ioredis";
import type { DeafultJob } from "./groups/default";
import type { GithubJob } from "./groups/github";
import type { MainJob } from "./groups/main";

// -----------------------
// Environment
// -----------------------

const APP_ENV = process.env.APP_ENV;
const env =
	APP_ENV === "production" || APP_ENV === "development"
		? APP_ENV
		: "development";

const MODE: "redis" | "file" =
	env === "production" ? "redis" : "file";

const REDIS_URL =
	process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const BASE_KEY = "sayr_jobs";

const ROOT_DIR = path.resolve(__dirname, "../../../");
const FILE_DIR = path.join(ROOT_DIR, ".queues");

// -----------------------
// Group <-> Job mapping
// -----------------------

export interface JobGroups {
	default: DeafultJob;
	github: GithubJob;
	main: MainJob;
}

export type AnyJob = JobGroups[keyof JobGroups];

// -----------------------
// Redis (lazy init)
// -----------------------

let redis: Redis | null = null;

export function getRedis(): Redis {
	if (redis) return redis;

	redis = new Redis(REDIS_URL, {
		maxRetriesPerRequest: null, // important for workers
		enableReadyCheck: true,
		retryStrategy(times) {
			const delay = Math.min(times * 200, 5000);
			console.error(
				`[queue] Redis reconnect attempt #${times}, retrying in ${delay}ms`
			);
			return delay;
		},
	});

	redis.on("connect", () => {
		console.log("[queue] Redis TCP connection established");
	});

	redis.on("ready", () => {
		console.log("[queue] Redis connection ready");
	});

	redis.on("reconnecting", (delay: any) => {
		console.warn(
			`[queue] Redis reconnecting in ${delay}ms`
		);
	});

	redis.on("end", () => {
		console.error("[queue] Redis connection closed");
	});

	redis.on("error", (err) => {
		console.error("[queue] Redis error:", err);
	});

	return redis;
}

// -----------------------
// File helpers
// -----------------------

async function ensureFileDir() {
	await fs.mkdir(FILE_DIR, { recursive: true });
}

function filePathFor(group: string): string {
	return path.join(FILE_DIR, `queue_${group}.json`);
}

async function readFileQueue<G extends keyof JobGroups>(
	group: G
): Promise<JobGroups[G][]> {
	try {
		await ensureFileDir();

		const filePath = filePathFor(group as string);

		const raw = await fs.readFile(filePath, "utf8").catch(() => "");
		if (!raw) return [];

		return JSON.parse(raw) as JobGroups[G][];
	} catch (err) {
		console.error(
			`[queue] Failed to read queue file (${String(group)}):`,
			err
		);
		return [];
	}
}

async function writeFileQueue<G extends keyof JobGroups>(
	group: G,
	data: JobGroups[G][]
) {
	try {
		await ensureFileDir();

		const filePath = filePathFor(group as string);

		const tmp = `${filePath}.tmp`;
		await fs.writeFile(
			tmp,
			JSON.stringify(data, null, 2),
			"utf8"
		);
		await fs.rename(tmp, filePath);
	} catch (err) {
		console.error(
			`[queue] Failed to write queue file (${String(group)}):`,
			err
		);
	}
}

// -----------------------
// Enqueue
// -----------------------

export async function enqueue<G extends keyof JobGroups>(
	group: G,
	job: JobGroups[G]
) {
	if (!job?.type) {
		throw new Error("Job must include a 'type' field");
	}

	if (MODE === "redis") {
		const key = `${BASE_KEY}:${group}`;
		await getRedis().lpush(key, JSON.stringify(job));
		console.log(
			`[queue] Enqueued (${MODE}:${key}) → ${job.type}`
		);
		return;
	}

	const queue = await readFileQueue(group);
	queue.push(job);
	await writeFileQueue(group, queue);

	console.log(
		`[queue] Enqueued (${MODE}:${String(group)}) → ${job.type}`
	);
}

// -----------------------
// Dequeue
// -----------------------

export async function dequeue<G extends keyof JobGroups>(
	group: G
): Promise<JobGroups[G] | undefined> {
	if (MODE === "redis") {
		const key = `${BASE_KEY}:${group}`;
		try {
			// Block for up to 5 seconds
			const result = await getRedis().brpop(key, 5);

			if (!result) return undefined;

			const [, value] = result;

			return JSON.parse(value) as JobGroups[G];
		} catch (err) {
			console.error("[queue] Redis BRPOP error:", err);
			return undefined;
		}
	}

	const queue = await readFileQueue(group);
	const job = queue.shift();
	await writeFileQueue(group, queue);

	return job;
}
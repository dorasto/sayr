import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";
import type { DeafultJob } from "./groups/default";
// Import all group job type unions
import type { GithubJob } from "./groups/github";

// -----------------------
// 🔹 Group <-> Job mapping
// -----------------------

export interface JobGroups {
	default: DeafultJob;
	github: GithubJob;
	// notifications: NotificationJob; // add more groups here later
}

export type AnyJob = JobGroups[keyof JobGroups];

// -----------------------
// ⚙️ Queue setup
// -----------------------
const MODE = process.env.QUEUE_MODE ?? "file";
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const BASE_KEY = "sayr_jobs";

const ROOT_DIR = path.resolve(__dirname, "../../../");
const FILE_DIR = path.join(ROOT_DIR, ".queues");

let redis: Redis | null = null;
if (MODE === "redis") redis = new Redis(REDIS_URL);
if (MODE === "file" && !fs.existsSync(FILE_DIR)) {
	fs.mkdirSync(FILE_DIR, { recursive: true });
}

// -----------------------
// 🔹 File helpers
// -----------------------
function filePathFor(group: string): string {
	return path.join(FILE_DIR, `queue_${group}.json`);
}

function readFileQueue<G extends keyof JobGroups>(group: G): JobGroups[G][] {
	const filePath = filePathFor(group as string);
	try {
		if (!fs.existsSync(filePath)) return [];
		const raw = fs.readFileSync(filePath, "utf8");
		return raw ? (JSON.parse(raw) as JobGroups[G][]) : [];
	} catch (err) {
		console.error(`❌ Failed to read queue file (${group}):`, err);
		return [];
	}
}

function writeFileQueue<G extends keyof JobGroups>(group: G, data: JobGroups[G][]) {
	const filePath = filePathFor(group as string);
	try {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
	} catch (err) {
		console.error(`❌ Failed to write queue file (${group}):`, err);
	}
}

// -----------------------
// 🔸 Enqueue / Dequeue
// -----------------------

export async function enqueue<G extends keyof JobGroups>(group: G, job: JobGroups[G]) {
	switch (MODE) {
		case "redis": {
			const key = `${BASE_KEY}:${group}`;
			await redis?.lpush(key, JSON.stringify(job));
			console.log(`📦 [redis:${key}] Enqueued → ${job.type}`);
			break;
		}

		case "file": {
			const queue = readFileQueue(group);
			queue.push(job);
			writeFileQueue(group, queue);
			console.log(`📦 [file:${group}] Enqueued → ${job.type}`);
			break;
		}

		default:
			console.log("⚠️ Unknown queue mode; job ignored");
	}
}

export async function dequeue<G extends keyof JobGroups>(group: G): Promise<JobGroups[G] | undefined> {
	switch (MODE) {
		case "redis": {
			const key = `${BASE_KEY}:${group}`;
			const res = await redis?.rpop(key);
			if (!res) return undefined;
			return JSON.parse(res) as JobGroups[G];
		}

		case "file": {
			const queue = readFileQueue(group);
			const job = queue.shift();
			writeFileQueue(group, queue);
			return job;
		}

		default:
			return undefined;
	}
}

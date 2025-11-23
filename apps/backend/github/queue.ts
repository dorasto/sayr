import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";

export type Job = {
	type: "issue_opened" | "issue_comment" | "sayr_keyword_parse";
	// biome-ignore lint/suspicious/noExplicitAny: needed for now
	payload: any;
};

const MODE = process.env.QUEUE_MODE ?? "file"; // local default
const FILE_PATH = path.resolve("./queue.json");
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const QUEUE_KEY = "sayr_jobs";

let redis: Redis | null = null;
if (MODE === "redis") redis = new Redis(REDIS_URL);

// -----------------------
// 🔹 File helpers
// -----------------------
function readFileQueue(): Job[] {
	try {
		if (!fs.existsSync(FILE_PATH)) return [];
		const raw = fs.readFileSync(FILE_PATH, "utf8");
		return raw ? (JSON.parse(raw) as Job[]) : [];
	} catch (err) {
		console.error("❌ Failed to read queue file:", err);
		return [];
	}
}

function writeFileQueue(data: Job[]) {
	try {
		fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
	} catch (err) {
		console.error("❌ Failed to write queue file:", err);
	}
}

// -----------------------
// 🔸 Enqueue / Dequeue
// -----------------------
export async function enqueue(job: Job) {
	switch (MODE) {
		case "redis":
			await redis!.lpush(QUEUE_KEY, JSON.stringify(job));
			console.log(`📦 [redis] Enqueued → ${job.type}`);
			break;

		case "file": {
			const queue = readFileQueue();
			queue.push(job);
			writeFileQueue(queue);
			console.log(`📦 [file] Enqueued → ${job.type}`);
			break;
		}

		default:
			console.log("⚠️ Unknown queue mode; job ignored");
	}
}

export async function dequeue(): Promise<Job | undefined> {
	switch (MODE) {
		case "redis": {
			const res = await redis!.rpop(QUEUE_KEY);
			if (!res) return undefined;
			return JSON.parse(res) as Job;
		}

		case "file": {
			const queue = readFileQueue();
			const job = queue.shift();
			writeFileQueue(queue);
			return job;
		}

		default:
			return undefined;
	}
}

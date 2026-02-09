import { dequeue, type JobGroups } from "@repo/queue";
import { handleSayrKeywordParse } from "./github";
import { withTraceContext } from "@repo/opentelemetry/trace";
import { initTracing } from "@repo/opentelemetry";

const APP_ENV = process.env.APP_ENV;
const env =
	APP_ENV === "production" || APP_ENV === "development"
		? APP_ENV
		: "development";

let shuttingDown = false;

process.on("SIGTERM", () => {
	shuttingDown = true;
	console.log("🛑 SIGTERM received, shutting down...");
});

process.on("SIGINT", () => {
	shuttingDown = true;
	console.log("🛑 SIGINT received, shutting down...");
});

async function processGithubJob(job: JobGroups["github"]) {
	switch (job.type) {
		case "sayr_keyword_parse":
			await handleSayrKeywordParse(job);
			break;
		default:
			console.warn(`⚠️ Unhandled GitHub job type: ${job.type}`);
	}
}

async function handleJob<G extends keyof JobGroups>(
	group: G,
	job: JobGroups[G]
) {
	const traceContext = "traceContext" in job ? job.traceContext : undefined;

	try {
		await withTraceContext(
			traceContext,
			`worker.${group}.${job.type}`,
			async () => {
				switch (group) {
					case "github":
						await processGithubJob(job as JobGroups["github"]);
						break;
					default:
						console.warn(`⚠️ No handler defined for group "${group}"`);
				}
			}
		);
	} catch (err) {
		console.error(`❌ [${group}] ${job.type} failed:`, err);
	}
}

async function workerLoop<G extends keyof JobGroups>(group: G) {
	const MODE = env === "production" ? "redis" : "file";
	console.log(`⚙️  Worker for "${group}" started (${MODE} mode)`);

	if (MODE === "redis") {
		while (!shuttingDown) {
			const job = await dequeue(group);
			if (shuttingDown) break;
			if (!job) continue;
			await handleJob(group, job);
		}
	} else {
		let idleMs = 100;

		while (!shuttingDown) {
			const job = await dequeue(group);

			if (!job) {
				await Bun.sleep(idleMs);
				idleMs = Math.min(idleMs * 2, 5000);
				continue;
			}

			idleMs = 100;
			await handleJob(group, job);
		}
	}

	console.log(`✅ Worker for "${group}" stopped cleanly`);
}

async function main() {
	const groupArg = process.argv[2] as keyof JobGroups | undefined;

	if (!groupArg) {
		console.error(
			"❌ Missing group argument.\nUsage: bun run dev <group>\nExample: bun run dev github"
		);
		process.exit(1);
	}

	if (!["github"].includes(groupArg)) {
		console.error(`❌ Unknown group "${groupArg}".`);
		process.exit(1);
	}

	initTracing(`sayr-worker-${groupArg}`);
	await workerLoop(groupArg);
}

main();
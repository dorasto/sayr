import { dequeue, type JobGroups } from "@repo/queue";
import { handleSayrKeywordParse } from "./github";

async function processGithubJob(job: JobGroups["github"]) {
	switch (job.type) {
		case "sayr_keyword_parse":
			await handleSayrKeywordParse(job);
			break;
		default:
			console.warn(`⚠️ Unhandled GitHub job type: ${job.type}`);
	}
}

async function handleJob<G extends keyof JobGroups>(group: G, job: JobGroups[G]) {
	const start = Date.now();
	try {
		switch (group) {
			case "github":
				await processGithubJob(job as JobGroups["github"]);
				break;
			default:
				console.warn(`⚠️ No handler defined for group "${group}"`);
		}
		console.log(`✅ [${group}] ${job.type} done in ${Date.now() - start}ms`);
	} catch (err) {
		console.error(`❌ [${group}] ${job.type} failed:`, err);
	}
}

async function workerLoop<G extends keyof JobGroups>(group: G) {
	const MODE = process.env.QUEUE_MODE ?? "file";
	console.log(`⚙️ Worker for "${group}" started (${MODE} mode)`);

	// Redis mode doesn't need adaptive sleep; brpop() itself blocks.
	if (MODE === "redis") {
		while (true) {
			const job = await dequeue(group);
			if (job) await handleJob(group, job);
			// BRPOP waits internally, so no need for Bun.sleep().
		}
	} else {
		// File mode: adaptive sleep and backoff to mimic blocking I/O
		let idleMs = 100;
		while (true) {
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
}
async function main() {
	const groupArg = process.argv[2] as keyof JobGroups | undefined;

	if (!groupArg) {
		console.error(
			"❌ Missing group argument.\nUsage: bun run dev <group>\nExample: bun run dev github"
		);
		process.exit(1);
	}

	if (!["github", "default"].includes(groupArg)) {
		console.error(`❌ Unknown group "${groupArg}".`);
		process.exit(1);
	}

	await workerLoop(groupArg);
}

main();
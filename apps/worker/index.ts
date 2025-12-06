import { dequeue, type JobGroups } from "@repo/queue";
import {
	handleBlockKeyword,
	handleCloseKeyword,
	handleLinkKeyword,
	type KeywordContext,
	postGithubComment,
} from "./github/keywordActions";
import { extractSayrKeywords } from "./github/keywords";

/**
 * Handles a "sayr_keyword_parse" GitHub job.
 */
async function handleSayrKeywordParse(
	job: JobGroups["github"] & { type: "sayr_keyword_parse" }
) {
	const {
		text,
		eventType,
		number,
		owner,
		repoId,
		repo,
		merged,
		installationId,
		organizationId,
		categoryId,
	} = job.payload;

	if (!organizationId || !categoryId) {
		console.log(`⚠️ Missing org or category for ${repo}#${number} — skipping.`);
		return;
	}

	console.log(`🔍 [${repo}#${number}] Checking ${eventType} for Sayr keywords...`);

	const matches = extractSayrKeywords(text);
	if (!matches.length) {
		console.log(`ℹ️ [${repo}#${number}] No Sayr keywords found.`);
		return;
	}

	const ctxBase: Omit<KeywordContext, "taskKey"> = {
		owner,
		repoId,
		repo,
		number,
		installationId,
		merged,
		orgId: organizationId,
		categoryId,
	};

	const summaryLines: string[] = [];

	for (const m of matches) {
		const ctx: KeywordContext = { ...ctxBase, taskKey: m.taskKey };
		const action = m.keyword.toLowerCase();

		switch (action) {
			case "fixes":
			case "fixed":
			case "closes":
			case "closed":
			case "resolves":
			case "resolved": {
				const closeResult = await handleCloseKeyword(ctx);
				summaryLines.push(closeResult);
				break;
			}
			case "blocked by":
				await handleBlockKeyword(ctx);
				summaryLines.push(`🚧 Blocked by ${m.taskKey}`);
				break;
			case "ref":
			case "sayr":
				await handleLinkKeyword(ctx);
				summaryLines.push(`🔗 Linked to ${m.taskKey}`);
				break;
			default:
				summaryLines.push(`⚙️ Unknown keyword ${m.keyword}`);
				break;
		}
	}

	const comment =
		`🤖 Sayr keyword(s) detected on this ${eventType}:\n` +
		summaryLines.join("\n") +
		(merged ? "\n✅ PR merged!" : "");

	await postGithubComment({ ...ctxBase, taskKey: 0 }, comment);
	console.log(`💬 [${repo}#${number}] Comment posted to GitHub.`);
}

/**
 * Process a GitHub job.
 */
async function processGithubJob(job: JobGroups["github"]) {
	switch (job.type) {
		case "sayr_keyword_parse":
			await handleSayrKeywordParse(job);
			break;
		default:
			console.log(`⚠️ Unhandled GitHub job type: ${job.type}`);
	}
}

/**
 * Generic worker loop for a given queue group.
 */
async function workerLoop<G extends keyof JobGroups>(group: G) {
	const MODE = process.env.QUEUE_MODE ?? "file";
	console.log(`⚙️  Worker for group "${group}" started (${MODE} mode)`);

	while (true) {
		const job = await dequeue(group);
		if (!job) {
			await Bun.sleep(200);
			continue;
		}

		try {
			const start = Date.now();
			console.log(`🧾 [${group}] Processing job: ${job.type}`);

			switch (group) {
				case "github":
					await processGithubJob(job as JobGroups["github"]);
					break;

				default:
					console.log(`⚠️ No handler defined for group "${group}"`);
			}

			const duration = Date.now() - start;
			console.log(`✅ [${group}] Done in ${duration}ms`);
			console.log("--------------------------------");
		} catch (err) {
			console.error(`❌ [${group}] Error:`, err);
		}
	}
}

/**
 * Entry point — chooses what queue group to work on.
 */
async function main() {
	// Grab first argument after script name
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

	await workerLoop(groupArg);
}

main();
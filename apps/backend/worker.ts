import {
	handleBlockKeyword,
	handleCloseKeyword,
	handleLinkKeyword,
	type KeywordContext,
	postGithubComment,
} from "./github/keywordActions";
import { extractSayrKeywords } from "./github/keywords";
import { dequeue, type Job } from "./github/queue";

async function handleSayrKeywordParse(job: Job) {
	const { text, eventType, number, owner, repo, merged, installationId } = job.payload;

	console.log(`🔍 [${repo}#${number}] Checking ${eventType} for Sayr keywords...`);

	const matches = extractSayrKeywords(text);
	if (!matches.length) {
		console.log(`ℹ️ [${repo}#${number}] No Sayr keywords found.`);
		return;
	}

	const ctxBase: Omit<KeywordContext, "issueKey"> = {
		owner,
		repo,
		number,
		installationId,
		merged,
	};

	const summaryLines: string[] = [];

	for (const m of matches) {
		const ctx: KeywordContext = { ...ctxBase, issueKey: m.issueKey };
		const action = m.keyword.toLowerCase();

		switch (action) {
			case "fixes":
			case "fixed":
			case "closes":
			case "closed":
			case "resolves":
			case "resolved":
				await handleCloseKeyword(ctx);
				summaryLines.push(`✅ Closed Sayr issue ${m.issueKey}`);
				break;

			case "blocked by":
				await handleBlockKeyword(ctx);
				summaryLines.push(`🚧 Blocked by ${m.issueKey}`);
				break;

			case "ref":
			case "sayr":
				await handleLinkKeyword(ctx);
				summaryLines.push(`🔗 Linked to ${m.issueKey}`);
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

	await postGithubComment({ ...ctxBase, issueKey: 0 }, comment);

	console.log(`💬 [${repo}#${number}] Comment posted to GitHub.`);
}

async function processJob(job: Job) {
	switch (job.type) {
		case "sayr_keyword_parse":
			await handleSayrKeywordParse(job);
			break;
		default:
			console.log(`⚠️ Unhandled job type: ${job.type}`);
	}
}

async function workerLoop() {
	console.log("⚙️ Sayr worker started (file/redis mode)");
	while (true) {
		const job = await dequeue();
		if (!job) {
			await Bun.sleep(200);
			continue;
		}

		try {
			const start = Date.now();
			console.log(`🧾 Processing job: ${job.type}`);
			await processJob(job);
			console.log(`✅ Job ${job.type} done in ${Date.now() - start}ms`);
		} catch (err) {
			console.error(`❌ Error processing job:`, err);
		}
	}
}

workerLoop();

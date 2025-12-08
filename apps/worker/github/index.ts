import { JobGroups } from "@repo/queue";
import { handleBlockKeyword, handleCloseKeyword, handleLinkKeyword, type KeywordContext } from "./keywordActions";
import { extractSayrKeywords } from "./keywords";
import { getInstallationToken } from "@repo/util/github/auth";
import { Octokit } from "@octokit/rest";

export async function handleSayrKeywordParse(job: JobGroups["github"] & { type: "sayr_keyword_parse" }) {
	const { text, eventType, number, owner, repoId, repo, merged, installationId, organizationId, categoryId } =
		job.payload;

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

// --- GitHub comment summary (optional) ---
export async function postGithubComment(ctx: KeywordContext, body: string) {
	const token = await getInstallationToken(ctx.installationId);
	const octokit = new Octokit({ auth: token });

	await octokit.issues.createComment({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: ctx.number,
		body,
	});
}

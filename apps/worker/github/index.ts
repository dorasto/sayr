import type { JobGroups } from "@repo/queue";
import { handleBlockKeyword, handleCloseKeyword, handleLinkKeyword, type KeywordContext } from "./keywordActions";
import { extractSayrKeywords } from "./keywords";
import { getInstallationToken } from "@repo/util/github/auth";
import { Octokit } from "@octokit/rest";
import { createTraceAsync } from "@repo/opentelemetry/trace";

export async function handleSayrKeywordParse(job: JobGroups["github"] & { type: "sayr_keyword_parse" }) {
	const traceAsync = createTraceAsync();
	const { text, eventType, number, owner, repoId, repo, merged, installationId, organizationId, categoryId } =
		job.payload;

	if (!organizationId || !categoryId) {
		return;
	}

	const matches = await traceAsync("github.keyword.extract", async () => extractSayrKeywords(text), {
		description: "Extracting Sayr keywords from text",
		data: { repo, number, eventType },
		onSuccess: (result) => ({
			outcome: result.length ? "Keywords found" : "No keywords found",
			data: { matchCount: result.length },
		}),
	});

	if (!matches.length) return;

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

		await traceAsync(
			`github.keyword.${action.replace(" ", "_")}`,
			async () => {
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
					case "sayr": {
						const linkResult = await handleLinkKeyword(ctx);
						summaryLines.push(linkResult);
						break;
					}
					default:
						summaryLines.push(`⚙️ Unknown keyword ${m.keyword}`);
						break;
				}
			},
			{
				description: `Processing "${action}" keyword`,
				data: { taskKey: m.taskKey, keyword: action, repo, number },
			}
		);
	}

	const comment =
		`🤖 Sayr keyword(s) detected on this ${eventType}:\n` +
		summaryLines.join("\n") +
		(merged ? "\n✅ PR merged!" : "");

	await traceAsync("github.comment.post", () => postGithubComment({ ...ctxBase, taskKey: 0 }, comment), {
		description: "Posting summary comment to GitHub",
		data: { repo, number, keywordCount: matches.length },
		onSuccess: () => ({
			outcome: "Comment posted",
			data: {
				comment: comment,
			},
		}),
	});
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

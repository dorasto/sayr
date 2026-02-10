import type { JobGroups } from "@repo/queue";
import { handleBlockKeyword, handleCloseKeyword, handleLinkKeyword, type KeywordContext } from "./keywordActions";
import { extractSayrKeywords } from "./keywords";
import { getInstallationToken } from "@repo/util/github/auth";
import { Octokit } from "@octokit/rest";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { db } from "@repo/database";
import { postSayrComment } from "./comment";
import { eq, and } from "drizzle-orm";

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

	const ctxBase: Omit<KeywordContext, "taskKey" | "message"> = {
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
	const processed = new Set<string>();
	for (const m of matches) {
		const action = m.keyword.toLowerCase();
		const dedupeKey = `${action}:${m.taskKey}`;

		if (processed.has(dedupeKey)) {
			continue;
		}

		processed.add(dedupeKey);

		const ctx: KeywordContext = {
			...ctxBase,
			taskKey: m.taskKey,
			message: text,
		};

		await traceAsync(
			`github.keyword.${action.replace(/\s+/g, "_")}`,
			async () => {
				switch (action) {
					case "fixes":
					case "fixed":
					case "closes":
					case "closed":
					case "resolves":
					case "resolved": {
						const closeResult = await handleCloseKeyword(ctx);
						if (closeResult) summaryLines.push(closeResult);
						break;
					}
					case "blocked by":
						await handleBlockKeyword(ctx);
						summaryLines.push(`Marked as blocked by ${m.taskKey}`);
						break;
					case "ref":
					case "sayr": {
						const linkResult = await handleLinkKeyword(ctx);
						if (linkResult) summaryLines.push(linkResult);
						break;
					}
					default:
						break;
				}
			},
			{
				description: `Processing "${action}" keyword`,
				data: { taskKey: m.taskKey, keyword: action, repo, number },
			}
		);
	}
	if (!summaryLines.length) {
		await traceAsync("github.comment.skip", async () => { }, {
			description: "No actionable Sayr keywords found",
			data: { repo, number },
		});
		return;
	}
	const comment =
		`Sayr updates from this ${eventType}:\n` +
		summaryLines.map((l) => `• ${l}`).join("\n") +
		(merged ? "\n\nThis pull request has been merged." : "");

	await traceAsync("github.comment.post", () => postGithubComment({ ...ctxBase }, comment), {
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
export async function postGithubComment(ctx: Omit<KeywordContext, "taskKey" | "message">, body: string) {
	const token = await getInstallationToken(ctx.installationId);
	const octokit = new Octokit({ auth: token });

	await octokit.issues.createComment({
		owner: ctx.owner,
		repo: ctx.repo,
		issue_number: ctx.number,
		body,
	});
}

export async function handleComment(
	job: JobGroups["github"] & { type: "issue_comment" }
) {
	const traceAsync = createTraceAsync();
	const {
		owner,
		organizationId,
		number,
		repo,
		commentId,
		commentBody,
		user,
		userId,
		repo_private
	} = job.payload;

	// --------------------
	// Sanitize content (no uploads)
	// --------------------
	console.log("🚀 ~ handleComment ~ commentBody:", commentBody)
	const sanitizedBody = commentBody.replace(
		/<(img|video|iframe|object|embed)[^>]*>/gi,
		""
	);

	if (!sanitizedBody.trim()) {
		return;
	}

	// --------------------
	// Find linked Sayr task
	// --------------------
	const githubIssue = await traceAsync(
		"github.issue.link.lookup",
		() =>
			db.query.githubIssue.findFirst({
				where: (gi) =>
					and(
						eq(gi.organizationId, organizationId || ""),
						eq(gi.issueNumber, number)
					),
				with: { task: true },
			}),
		{
			description: "Looking up linked Sayr task for GitHub issue",
			data: { owner, organizationId, number },
		}
	);

	if (!githubIssue?.task) {
		return;
	}

	// --------------------
	// Post comment to Sayr
	// (prefix + prosekit handled inside)
	// --------------------
	await traceAsync(
		"sayr.comment.sync",
		() =>
			postSayrComment(
				{
					taskKey: githubIssue.task.shortId || 0,
					orgId: githubIssue.task.organizationId,
					owner,
					repo,
					number,
					authorLogin: user,
					authorGithubId: userId,
					repo_private,
					externalCommentId: commentId
				},
				sanitizedBody
			),
		{
			description: "Posting GitHub comment to Sayr",
			data: {
				taskKey: githubIssue.task.shortId,
				commentId,
				user,
			},
		}
	);
}
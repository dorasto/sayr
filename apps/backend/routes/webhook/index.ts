import type { AppEnv } from "@/index";
import { createTraceAsync, getTraceContext } from "@repo/opentelemetry/trace";
import { db, schema } from "@repo/database";
import { enqueue } from "@repo/queue";
import { verifySignature } from "@repo/util/github/verify";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

export const webhookRoute = new Hono<AppEnv>();
webhookRoute.post("/github", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const signature = c.req.header("x-hub-signature-256");
	const event = c.req.header("x-github-event");
	const rawBody = await c.req.text();

	if (!verifySignature(signature ?? null, rawBody)) {
		await recordWideError({
			name: "webhook.github.signature",
			error: new Error("Invalid signature"),
			code: "INVALID_SIGNATURE",
			message: "GitHub webhook signature verification failed",
			contextData: { event },
		});
		return c.text("❌ invalid signature", 401);
	}

	const payload = JSON.parse(rawBody);

	switch (event) {
		case "installation":
			return handleInstallationEvent(payload, traceAsync);

		case "issues":
		case "issue_comment":
		case "pull_request":
		case "push":
			await handleContentEvents(event, payload, traceAsync);
			break;

		default:
			break;
	}

	return c.text("✅ Job(s) received");
});

async function handleInstallationEvent(
	payload: { action: string; installation: { id: number } },
	traceAsync: ReturnType<typeof createTraceAsync>
) {
	const installationId = payload.installation.id;

	if (payload.action === "created") {
		await traceAsync(
			"webhook.github.installation.create",
			() =>
				db.insert(schema.githubInstallation).values({
					id: crypto.randomUUID(),
					installationId,
				}),
			{
				description: "Creating GitHub installation record",
				data: { installationId },
				onSuccess: () => ({
					outcome: "Installation record created",
					data: { installationId },
				}),
			}
		);

		return new Response("Installation registered ✅");
	}

	if (payload.action === "deleted") {
		await traceAsync(
			"webhook.github.installation.delete",
			() => db.delete(schema.githubInstallation).where(eq(schema.githubInstallation.installationId, installationId)),
			{
				description: "Deleting GitHub installation record",
				data: { installationId },
				onSuccess: () => ({
					outcome: "Installation record deleted",
					data: { installationId },
				}),
			}
		);

		return new Response("Installation deleted ✅");
	}

	return new Response("✅ Job(s) received");
}

async function handleContentEvents(
	event: string,
	// biome-ignore lint/suspicious/noExplicitAny: <fix later>
	payload: any,
	traceAsync: ReturnType<typeof createTraceAsync>
) {
	const { installation, repository } = payload;
	const installationId = installation.id;
	const repoId = repository.id;

	const linked = await traceAsync(
		"webhook.github.repo_lookup",
		() =>
			db.query.githubRepository.findFirst({
				where: and(
					eq(schema.githubRepository.installationId, installationId),
					eq(schema.githubRepository.repoId, repoId),
					eq(schema.githubRepository.enabled, true)
				),
			}),
		{
			description: "Checking if repository is linked",
			data: { installationId, repoId },
		}
	);

	if (!linked) return;

	const traceContext = getTraceContext();

	switch (event) {
		case "push": {
			const branch = payload.ref?.replace("refs/heads/", "");
			if (!branch) return;

			// ✅ Check if this branch belongs to an open PR
			const existingPr = await db.query.githubPullRequest.findFirst({
				where: (t) =>
					and(
						eq(t.repositoryId, linked.id), // githubRepository.id
						eq(t.headBranch, branch),
						eq(t.state, "open")
					),
			});

			// 🚫 If branch tied to open PR → skip (sync handler will handle it)
			if (existingPr) {
				break;
			}

			// ✅ Normal push flow (non-PR branches)
			const commits =
				Array.isArray(payload.commits) && payload.commits.length > 0
					? payload.commits
					: payload.head_commit
						? [payload.head_commit]
						: [];

			if (!commits.length) return;

			for (const commit of commits) {
				const message = commit.message?.trim();
				if (!message) continue;

				const keywordMatches = extractSayrKeywords(message);
				if (!keywordMatches.length) continue;

				await enqueue("github", {
					type: "github_commit_ref",
					traceContext,
					payload: {
						organizationId: linked.organizationId || "",
						repoOwner: repository.owner.login,
						repoName: repository.name,
						repoPrivate: repository.private,

						commitSha: commit.id,
						commitUrl: commit.url,
						commitMessage: message,
						userId: commit?.user?.id,
						authorLogin: commit.author?.username ?? null,
						authorEmail: commit.author?.email ?? null,

						matches: keywordMatches,
					},
				});
			}

			break;
		}
		case "issues":
			if (payload.action === "opened") {
				await traceAsync(
					"webhook.github.issue.enqueue",
					() =>
						enqueue("github", {
							type: "sayr_keyword_parse",
							traceContext,
							payload: {
								text: payload.issue.body ?? "",
								title: payload.issue.title ?? "",
								owner: repository.owner.login,
								repoId: repository.id,
								repo: repository.name,
								repo_private: repository.private,
								number: payload.issue.number,
								installationId,
								eventType: "issue",
								organizationId: linked.organizationId,
								categoryId: linked.categoryId,
							},
						}),
					{
						description: "Enqueueing issue for processing",
						data: {
							issueNumber: payload.issue.number,
							repoId,
							organizationId: linked.organizationId,
							traceId: traceContext?.traceId,
						},
						onSuccess: () => ({
							outcome: "Issue enqueued successfully",
							data: { issueNumber: payload.issue.number },
						}),
					}
				);
			}
			break;

		case "issue_comment":
			if (payload.action === "created") {
				const issueNum = payload.issue.number;
				const commenter = payload.comment?.user?.login ?? "unknown";
				const commenterId = payload.comment?.user?.id;
				const body = payload.comment?.body?.trim() ?? "";

				if (!body) return;
				if (commenter.endsWith("[bot]")) return;

				const keywordMatches = extractSayrKeywords(body);

				// ---------------------------
				// CASE 1: KEYWORDS → automation
				// ---------------------------
				if (keywordMatches.length > 0) {
					await enqueue("github", {
						type: "sayr_keyword_parse",
						traceContext,
						payload: {
							text: body,
							title: "",
							eventType: "comment",
							number: issueNum,
							owner: repository.owner.login,
							repo: repository.name,
							repoId: repository.id,
							repo_private: repository.private,
							installationId,
							merged: false,
							organizationId: linked.organizationId,
							categoryId: linked.categoryId,
						},
					});

					return;
				}

				// ---------------------------
				// CASE 2: NO KEYWORDS → comment sync
				// ---------------------------
				await enqueue("github", {
					type: "issue_comment",
					traceContext,
					payload: {
						owner: repository.owner.login,
						repo: repository.name,
						repoId: repository.id,
						repo_private: repository.private,
						organizationId: linked.organizationId,
						number: issueNum,
						commentId: payload.comment.id,
						commentBody: payload.comment.body ?? "",
						user: commenter,
						userId: commenterId,
						pull_request: repository.has_pull_requests
					},
				});
			}
			break;
		case "pull_request": {
			const action = payload.action;
			const pr = payload.pull_request;

			const prNumber = pr.number;
			const prTitle = pr.title ?? "";
			const prBody = pr.body ?? "";
			const merged = pr.merged ?? false;

			// Only care about lifecycle + new commits
			if (!["opened", "reopened", "synchronize", "closed"].includes(action)) {
				return;
			}

			// Ignore bot PRs
			const author = pr.user?.login ?? "";
			if (author.endsWith("[bot]")) return;

			// Extract keywords from title + body
			const keywordMatches = extractSayrKeywords(
				`${prTitle}\n${prBody}`
			);

			// ----------------------------------------
			// 1️⃣ PR OPENED / REOPENED
			// ----------------------------------------
			if (action === "opened" || action === "reopened") {
				await enqueue("github", {
					type: "pull_request_link",
					traceContext,
					payload: {
						linkedId: linked.id,
						organizationId: linked.organizationId,

						owner: repository.owner.login,
						repo: repository.name,
						repoId: repository.id,
						repo_private: repository.private,

						number: prNumber,
						title: prTitle,
						body: prBody,

						headSha: pr.head.sha,
						baseRef: pr.base.ref,
						headRef: pr.head.ref,
						headBranch: pr.head.ref,
						baseBranch: pr.base.ref,

						userId: pr.user?.id,
						author,
						matches: keywordMatches,
					},
				});

				return;
			}

			// ----------------------------------------
			// 2️⃣ NEW COMMITS PUSHED TO PR
			// ----------------------------------------
			if (action === "synchronize") {
				await enqueue("github", {
					type: "pull_request_sync",
					traceContext,
					payload: {
						linkedId: linked.id,
						organizationId: linked.organizationId,
						owner: repository.owner.login,
						repo: repository.name,
						repoId: repository.id,
						repo_private: repository.private,

						number: prNumber,
						headSha: pr.head.sha,
						before: payload.before,
						after: payload.after,
						userId: pr.user?.id,

						headBranch: pr.head.ref,
					},
				});

				return;
			}

			// ----------------------------------------
			// 3️⃣ PR CLOSED (Merged detection)
			// ----------------------------------------
			if (action === "closed") {
				await enqueue("github", {
					type: "pull_request_closed",
					traceContext,
					payload: {
						linkedId: linked.id,
						organizationId: linked.organizationId,
						owner: repository.owner.login,
						repo: repository.name,
						repoId: repository.id,
						repo_private: repository.private,
						userId: pr.user?.id,

						number: prNumber,
						merged,
						mergedAt: pr.merged_at,
						mergeCommitSha: pr.merge_commit_sha,
					},
				});

				return;
			}

			break;
		}
		default:
			break;
	}
}

export type KeywordMatch = {
	keyword: string;
	taskKey: number;
};

// ✅ Supports: "Ref 10", "Ref #10", "Fixes SA-123", "Sayr 42"
export function extractSayrKeywords(text: string): KeywordMatch[] {
	if (!text) return [];

	// Only match digits for the second capture group.
	// Will handle "Fixes 10", "Ref #15", "Sayr 42" etc.
	const regex = /\b(?:(Fixes|Fixed|Closes|Closed|Resolves|Resolved|Blocked by|Ref|Sayr)[\s:#-]*)#?(\d+)\b/gi;

	const matches: KeywordMatch[] = [];

	for (; ;) {
		const result = regex.exec(text);
		if (result === null) break;

		const taskKey = Number(result[2]); // force numeric

		// Skip invalid conversions (NaN guard)
		if (Number.isNaN(taskKey)) continue;

		matches.push({
			keyword: result[1] ?? "",
			taskKey,
		});
	}

	return matches;
}
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
					eq(schema.githubRepository.repoId, repoId)
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
						repo_private: repository.private,
						organizationId: linked.organizationId,
						number: issueNum,
						commentId: payload.comment.id,
						commentBody: payload.comment.body ?? "",
						user: commenter,
						userId: commenterId,
					},
				});
			}
			break;
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
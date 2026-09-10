import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { db } from "@repo/database";
import type { JobGroups } from "@repo/queue";
import { markdownToProsekitJSON } from "./markdownToProsekit";

const API_URL =
	process.env.APP_ENV === "development" ? "http://localhost:5468/api/internal" : "http://backend:5468/api/internal";

export type PostSayrCommentContext = {
	// Sayr task
	taskKey: number;
	orgId: string;

	// GitHub source
	owner: string;
	repo: string;
	repo_private: boolean;
	number: number;

	// Attribution
	authorLogin?: string;
	authorGithubId?: number;

	// External IDs
	externalCommentId?: number;
	pull_request?: boolean;
};

/**
 * Attempts to find a Sayr user linked to the given GitHub numeric ID.
 * Returns the Sayr user ID if found, otherwise undefined.
 */
async function findLinkedSayrUser(githubId?: number): Promise<string | undefined> {
	if (!githubId) return undefined;

	const linked = await db.query.account.findFirst({
		where: (a) => and(eq(a.providerId, "github"), eq(a.accountId, String(githubId))),
		columns: { userId: true },
	});

	return linked?.userId;
}

export async function postSayrComment(ctx: PostSayrCommentContext, body: string) {
	const traceAsync = createTraceAsync();

	return traceAsync(
		"sayr.comment.create",
		async () => {
			if (!body.trim()) {
				return;
			}

			const task = await db.query.task.findFirst({
				where: (t) => and(eq(t.organizationId, ctx.orgId), eq(t.shortId, ctx.taskKey)),
			});

			if (!task) {
				return;
			}

			// Look up linked Sayr user from GitHub account
			const linkedUserId = await findLinkedSayrUser(ctx.authorGithubId);

			const prosekitContent = markdownToProsekitJSON(body);
			const issueUrl = ctx.pull_request
				? `https://github.com/${ctx.owner}/${ctx.repo}/pull/${ctx.number}`
				: `https://github.com/${ctx.owner}/${ctx.repo}/issues/${ctx.number}`;
			const commentUrl = ctx.externalCommentId ? `${issueUrl}#issuecomment-${ctx.externalCommentId}` : undefined;
			const res = await fetch(`${API_URL}/v1/admin/organization/task/create-comment`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
					"user-agent": "Sayr-Worker/1.0",
					"x-internal-secret": process.env.INTERNAL_SECRET!,
					"x-internal-service": "sayr-worker",
					"x-internal-timestamp": new Date().toISOString(),
				},
				body: JSON.stringify({
					org_id: ctx.orgId,
					task_id: task.id,
					content: prosekitContent,
					source: "github",
					externalAuthorLogin: ctx.authorLogin,
					externalAuthorUrl: `https://github.com/${ctx.authorLogin}`,
					...(linkedUserId && { createdBy: linkedUserId }),
					// Visibility mirrors repo privacy
					visibility: ctx.repo_private ? "internal" : "public",
					// External linkage
					externalIssueNumber: ctx.number,
					externalCommentId: ctx.externalCommentId,
					externalCommentUrl: commentUrl,
					pullRequest: ctx.pull_request || false,
				}),
			});

			if (!res.ok) {
				const msg = `Failed to post comment to task ${ctx.taskKey}: ${res.statusText}`;
				console.error(msg);
				return msg;
			}

			console.log(
				`Comment posted to task ${ctx.taskKey}${linkedUserId ? ` (linked to Sayr user ${linkedUserId})` : ""}.`
			);
			return `Comment posted to task ${ctx.taskKey}.`;
		},
		{
			description: "Post Sayr comment from GitHub",
			data: {
				orgId: ctx.orgId,
				taskKey: ctx.taskKey,
				repo: ctx.repo,
				number: ctx.number,
				author: ctx.authorLogin,
			},
		}
	);
}

/**
 * Inbound sync: a GitHub comment (previously mirrored into Sayr on
 * creation) was edited upstream. Finds the matching `taskComment` by its
 * `externalCommentId` and pushes the new body through the same
 * `PUT /edit-comment` route the frontend uses, so the free history-snapshot
 * behavior already in that route applies here too.
 */
export async function handleCommentEdited(job: JobGroups["github"] & { type: "issue_comment_edited" }) {
	const traceAsync = createTraceAsync();
	const { organizationId, commentId, commentBody } = job.payload;

	if (!organizationId) return;

	return traceAsync(
		"github.comment.edited.process",
		async () => {
			const comment = await db.query.taskComment.findFirst({
				where: (t) =>
					and(eq(t.organizationId, organizationId), eq(t.source, "github"), eq(t.externalCommentId, commentId)),
			});

			if (!comment) return;

			const content = markdownToProsekitJSON(commentBody);

			const res = await fetch(`${API_URL}/v1/admin/organization/task/edit-comment`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
					"user-agent": "Sayr-Worker/1.0",
					"x-internal-secret": process.env.INTERNAL_SECRET!,
					"x-internal-service": "sayr-worker",
					"x-internal-timestamp": new Date().toISOString(),
				},
				body: JSON.stringify({
					org_id: organizationId,
					comment_id: comment.id,
					content,
				}),
			});

			if (!res.ok) {
				console.error(
					`❌ Failed to sync edited GitHub comment ${commentId} to comment ${comment.id}: ${res.statusText}`
				);
				return;
			}

			console.log(`Comment ${comment.id} updated from GitHub comment ${commentId}.`);
		},
		{
			description: "Syncing edited GitHub comment into linked Sayr comment",
			data: { orgId: organizationId, commentId },
		}
	);
}

/**
 * Inbound sync: a GitHub comment (previously mirrored into Sayr on
 * creation) was deleted upstream. Per the two-way-sync decision, this is a
 * hard delete on the Sayr side (cascades history/reactions via the existing
 * `DELETE /delete-comment` route).
 */
export async function handleCommentDeleted(job: JobGroups["github"] & { type: "issue_comment_deleted" }) {
	const traceAsync = createTraceAsync();
	const { organizationId, commentId } = job.payload;

	if (!organizationId) return;

	return traceAsync(
		"github.comment.deleted.process",
		async () => {
			const comment = await db.query.taskComment.findFirst({
				where: (t) =>
					and(eq(t.organizationId, organizationId), eq(t.source, "github"), eq(t.externalCommentId, commentId)),
			});

			if (!comment) return;

			const res = await fetch(`${API_URL}/v1/admin/organization/task/delete-comment`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					cookie: `sayr_internal=${process.env.INTERNAL_SECRET};`,
					"user-agent": "Sayr-Worker/1.0",
					"x-internal-secret": process.env.INTERNAL_SECRET!,
					"x-internal-service": "sayr-worker",
					"x-internal-timestamp": new Date().toISOString(),
				},
				body: JSON.stringify({
					org_id: organizationId,
					task_id: comment.taskId,
					comment_id: comment.id,
				}),
			});

			if (!res.ok) {
				console.error(
					`❌ Failed to sync deleted GitHub comment ${commentId} (Sayr comment ${comment.id}): ${res.statusText}`
				);
				return;
			}

			console.log(`Comment ${comment.id} deleted from GitHub comment ${commentId}.`);
		},
		{
			description: "Syncing deleted GitHub comment into linked Sayr comment",
			data: { orgId: organizationId, commentId },
		}
	);
}

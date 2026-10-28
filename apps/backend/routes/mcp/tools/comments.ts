import { createComment, db, getOrganizationMembers, getTaskComments, schema } from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveTaskId } from "../../../lib/apiRefs";
import { assertMcpAccess } from "../../../lib/mcp/auth";
import { prosekitJSONToMarkdown } from "../../../prosekit/markdown";
import { markdownToProsekitJSON } from "../../../prosekit/parser";
import { findSSEClientsByUserId, sseBroadcastIndividual, sseBroadcastPublic, sseBroadcastToRoom } from "../../events";
import type { ServerEventBaseMessage } from "../../events/types";
import { type McpUserClaims, resolveAndRateLimitOrg, toolError, toolJson } from "../context";

/** Mirrors comments.ts's own create-broadcast block — only goes to the public room when the comment itself is public. */
async function broadcastCommentCreated(orgId: string, taskId: string, visibility: "public" | "internal") {
	const data = { type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"], data: { id: taskId } };
	sseBroadcastToRoom(orgId, `task:${taskId}`, data);
	if (visibility === "public") sseBroadcastPublic(orgId, { ...data });
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findSSEClientsByUserId(member.userId);
		clients.forEach(
			(client) =>
				client.orgId !== orgId &&
				!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
				sseBroadcastIndividual(client, data, orgId)
		);
	});
}

/** Mirrors comments.ts's own edit/delete-broadcast block — unlike create, always goes to the public room (the mutation might be a visibility change). */
async function broadcastCommentMutation(orgId: string, taskId: string | null) {
	const data = { type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"], data: { id: taskId } };
	sseBroadcastToRoom(orgId, `task:${taskId}`, data);
	sseBroadcastPublic(orgId, { ...data });
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findSSEClientsByUserId(member.userId);
		clients.forEach(
			(client) =>
				client.orgId !== orgId &&
				!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
				sseBroadcastIndividual(client, data, orgId)
		);
	});
}

const COMMENTS_DEFAULT_LIMIT = 10;
const COMMENTS_MAX_LIMIT = 30;

export function registerCommentTools(server: McpServer, claims: McpUserClaims | null) {
	server.registerTool(
		"list_comments",
		{
			title: "List comments",
			description: "List top-level comments on a task (paginated), including reply counts.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				page: z.number().int().min(1).optional().describe("Default 1."),
				limit: z.number().int().min(1).max(COMMENTS_MAX_LIMIT).optional().describe("Default 10, up to 30."),
			}),
		},
		async ({ org, task: taskRef, page, limit }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read comments here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			const effectiveLimit = Math.min(limit ?? COMMENTS_DEFAULT_LIMIT, COMMENTS_MAX_LIMIT);
			const effectivePage = page ?? 1;
			const result = await getTaskComments(orgId, taskId, {
				offset: (effectivePage - 1) * effectiveLimit,
				limit: effectiveLimit,
			});

			const comments = (result?.comments ?? []).map((comment) => ({
				id: comment.id,
				content: comment.content ? prosekitJSONToMarkdown(comment.content) : null,
				visibility: comment.visibility,
				createdBy: comment.createdBy?.name ?? null,
				createdAt: comment.createdAt,
				replyCount: comment.replyCount,
			}));

			return toolJson({ comments, totalComments: result?.totalComments ?? 0 });
		}
	);

	server.registerTool(
		"create_comment",
		{
			title: "Create comment",
			description: "Post a comment on a task.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				content: z.string().min(1).describe("Markdown content."),
				visibility: z.enum(["public", "internal"]).optional().describe("Default public."),
			}),
		},
		async ({ org, task: taskRef, content, visibility }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			// Commenting requires org membership only, matching /v1/me/create_comment.
			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.comment");
			if (!allowed) {
				return toolError(
					"You don't have permission to comment here — the token is missing the tasks.comment scope, or you're not a member of this organization."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			const comment = await createComment(
				orgId,
				taskId,
				markdownToProsekitJSON(content),
				visibility ?? "public",
				claims.userId,
				"sayr"
			);
			if (!comment) return toolError("Failed to create comment.");

			await broadcastCommentCreated(orgId, taskId, visibility ?? "public");

			return toolJson({ id: comment.id, taskId });
		}
	);

	server.registerTool(
		"update_comment",
		{
			title: "Update comment",
			description:
				"Edit a comment's content or visibility. Editing your own only needs tasks.comment; editing someone else's needs moderation.manageComments.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				commentId: z.string(),
				content: z.string().min(1).describe("Markdown content."),
				visibility: z.enum(["public", "internal"]).optional(),
			}),
		},
		async ({ org, commentId, content, visibility }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const comment = await db.query.taskComment.findFirst({
				where: (t) => eq(t.id, commentId),
			});
			if (!comment || comment.organizationId !== orgId) return toolError(`No comment found for "${commentId}".`);

			const isAuthor = comment.createdBy === claims.userId;
			const allowed = isAuthor
				? await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.comment")
				: await assertMcpAccess(claims.userId, orgId, claims.scopes, "moderation.manageComments");
			if (!allowed) {
				return toolError(
					isAuthor
						? "You don't have permission to edit comments here — the token is missing the tasks.comment scope, or you're not a member of this organization."
						: "Editing another member's comment needs moderation.manageComments — the token is missing that scope, or your role in this organization doesn't allow it."
				);
			}

			await db.transaction(async (tx) => {
				await tx.insert(schema.taskCommentHistory).values({
					organizationId: comment.organizationId,
					taskId: comment.taskId,
					commentId: comment.id,
					editedBy: claims.userId,
					content: comment.content,
				});
				await tx
					.update(schema.taskComment)
					.set({
						content: markdownToProsekitJSON(content),
						visibility: visibility ?? comment.visibility,
						updatedAt: new Date(),
					})
					.where(eq(schema.taskComment.id, commentId));
			});

			await broadcastCommentMutation(comment.organizationId, comment.taskId);

			return toolJson({ id: commentId, taskId: comment.taskId });
		}
	);

	server.registerTool(
		"delete_comment",
		{
			title: "Delete comment",
			description:
				"Delete a comment. Deleting your own only needs tasks.comment; deleting someone else's needs moderation.manageComments.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				commentId: z.string(),
			}),
		},
		async ({ org, commentId }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const comment = await db.query.taskComment.findFirst({
				where: (t) => eq(t.id, commentId),
			});
			if (!comment || comment.organizationId !== orgId) return toolError(`No comment found for "${commentId}".`);

			const isAuthor = comment.createdBy === claims.userId;
			const allowed = isAuthor
				? await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.comment")
				: await assertMcpAccess(claims.userId, orgId, claims.scopes, "moderation.manageComments");
			if (!allowed) {
				return toolError(
					isAuthor
						? "You don't have permission to delete comments here — the token is missing the tasks.comment scope, or you're not a member of this organization."
						: "Deleting another member's comment needs moderation.manageComments — the token is missing that scope, or your role in this organization doesn't allow it."
				);
			}

			await db.transaction(async (tx) => {
				await tx.delete(schema.taskCommentHistory).where(eq(schema.taskCommentHistory.commentId, commentId));
				await tx.delete(schema.taskCommentReaction).where(eq(schema.taskCommentReaction.commentId, commentId));
				await tx.delete(schema.taskComment).where(eq(schema.taskComment.id, commentId));
			});

			await broadcastCommentMutation(comment.organizationId, comment.taskId);

			return toolJson({ id: commentId });
		}
	);
}

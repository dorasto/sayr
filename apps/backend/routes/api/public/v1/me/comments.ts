import { createComment, db, getOrganizationMembers, schema } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { markdownToProsekitJSON } from "@/prosekit/parser";
import {
	findSSEClientsByUserId,
	sseBroadcastIndividual,
	sseBroadcastPublic,
	sseBroadcastToRoom,
} from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";
import { assertApiAccess } from "../../../../../lib/apiKeyAuth";
import { resolveOrganizationId, resolveTaskId } from "../../../../../lib/apiRefs";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, successResponse } from "../../../../../responses";
import { CreatedBySchema, resolveActorId } from "./schemas";

export const commentsRoute = new Hono<AppEnv>();

const CreateTaskCommentSchemaData = z.object({
	id: z.string(),
});

const CreateTaskCommentData = {
	type: "object",
	required: ["taskId", "orgId", "content"],
	properties: {
		taskId: {
			type: "string",
			description: 'Task short id (the number in SAY-123, e.g. "123") or task id.',
		},
		orgId: {
			type: "string",
			description: 'Organization slug (e.g. "platform") or organization id.',
		},
		content: { type: "string" },
		visibility: {
			type: "string",
			enum: ["public", "internal"],
			default: "public",
		},
		createdBy: CreatedBySchema,
	},
};

commentsRoute.post(
	"/create_comment",
	describeOkNotFound({
		summary: "Create Task Comment",
		description: "Create a new comment on a task.",
		dataSchema: CreateTaskCommentSchemaData,
		bodySchema: CreateTaskCommentData,
		bodyExample: {
			taskId: "123",
			orgId: "platform",
			content: "## Comment Title",
			visibility: "public",
		},
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const body = await c.req.json();
		const { taskId: taskRef, orgId: orgRef, content, visibility, createdBy } = body;

		const orgId = await resolveOrganizationId(orgRef);
		if (!orgId) {
			return c.json(
				errorResponse("Organization not found", 'Pass the organization slug (e.g. "platform") or its id.'),
				404
			);
		}

		const { userId, invalidProvider } = await resolveActorId(createdBy, principal.userId);
		if (invalidProvider) {
			return c.json(errorResponse("Invalid CreatedBy type", "The provided CreatedBy type is invalid"), 400);
		}

		// Commenting requires org membership only, matching the internal route the UI
		// uses (task.ts `/create-comment`, which gates on "members").
		const isAuthorized = await assertApiAccess(c, orgId, "tasks.comment");
		if (!isAuthorized) {
			return c.json(
				errorResponse("You don't have permission to comment.", "You are not a member of this organization."),
				403
			);
		}

		const taskId = await resolveTaskId(orgId, taskRef);
		if (!taskId) {
			return c.json(errorResponse("Task not found", "Pass the task short id (e.g. 123) or its id."), 404);
		}

		const task = await traceAsync(
			"public.me.task.activity.task_lookup",
			() => db.query.task.findFirst({ where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)) }),
			{ description: "Finding task for activity", data: { orgId, taskId } }
		);

		if (!task) {
			return c.json(errorResponse("Task not found", "No task found with the provided ID in the organization"), 404);
		}

		// biome-ignore lint/suspicious/noExplicitAny: markdownToProsekitJSON's return type isn't exported
		const descriptionProsekit: any = content ? markdownToProsekitJSON(content) : undefined;

		const comment = await traceAsync("public.me.task.comment.insert", () =>
			createComment(
				orgId,
				taskId,
				descriptionProsekit,
				visibility,
				userId,
				"sayr",
				createdBy?.name ?? null,
				createdBy?.profileUrl ?? null,
				undefined,
				undefined,
				undefined,
				null
			)
		);

		if (!comment) {
			return c.json(errorResponse("Failed to create comment", "An error occurred while creating the comment"), 500);
		}

		await traceAsync(
			"task.comment.create.broadcast",
			async () => {
				const data = {
					type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
					data: { id: taskId },
				};
				sseBroadcastToRoom(orgId, `task:${taskId}`, data);
				if (visibility === "public") {
					sseBroadcastPublic(orgId, { ...data });
				}

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
			},
			{ description: "Broadcasting new comment to clients" }
		);

		return c.json(successResponse({ id: taskId }));
	}
);

/**
 * Broadcasts a comment mutation (edit or delete) to the org, mirroring the internal
 * `/edit-comment` and `/delete-comment` handlers' broadcast blocks. Kept identical so
 * connected browsers stay in sync regardless of which surface made the change.
 */
async function broadcastCommentMutation(orgId: string, taskId: string | null) {
	const data = {
		type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
		data: { id: taskId },
	};

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

const UpdateCommentSchema = {
	type: "object",
	required: ["content"],
	properties: {
		content: { type: "object", description: "Prosekit document JSON." },
		visibility: { type: "string", enum: ["public", "internal"] },
	},
};

const UpdateCommentSchemaData = z.object({
	id: z.string(),
});

/**
 * Editing an org comment mirrors the internal `PUT /edit-comment` handler exactly:
 * for a member of the org, there is NO author-only check — any member who can
 * comment can edit any comment. (Non-member guest editing of their own public
 * comment, the handler's other branch, is out of scope for v1 — a personal key's
 * owner not being a member of the org fails the "members" check below and gets a
 * clean 403 rather than silently degrading.)
 */
commentsRoute.patch(
	"/comments/:commentId",
	describeOkNotFound({
		summary: "Edit Task Comment",
		description: "Edit the content or visibility of a comment. Requires org membership — not limited to your own.",
		dataSchema: UpdateCommentSchemaData,
		bodySchema: UpdateCommentSchema,
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const commentId = c.req.param("commentId");
		const body = await c.req.json();
		const { content, visibility } = body;

		const comment = await traceAsync(
			"public.me.comment.edit.lookup",
			() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
			{ description: "Finding comment to edit", data: { commentId } }
		);

		if (!comment) {
			return c.json(errorResponse("Comment not found", "No comment found with the provided id"), 404);
		}

		const isAuthorized = await assertApiAccess(c, comment.organizationId, "tasks.comment");
		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to edit this comment.",
					"You are not a member of this organization."
				),
				403
			);
		}

		await traceAsync(
			"public.me.comment.edit.transaction",
			() =>
				db.transaction(async (tx) => {
					await tx.insert(schema.taskCommentHistory).values({
						organizationId: comment.organizationId,
						taskId: comment.taskId,
						commentId: comment.id,
						editedBy: principal.userId,
						content: comment.content,
					});

					await tx
						.update(schema.taskComment)
						.set({
							content,
							visibility: visibility ?? comment.visibility,
							updatedAt: new Date(),
						})
						.where(eq(schema.taskComment.id, commentId));
				}),
			{
				description: "Updating comment and inserting history",
				data: { orgId: comment.organizationId, commentId, taskId: comment.taskId, userId: principal.userId },
			}
		);

		await traceAsync(
			"public.me.comment.edit.broadcast",
			() => broadcastCommentMutation(comment.organizationId, comment.taskId),
			{ description: "Broadcasting comment update to clients" }
		);

		return c.json(successResponse({ id: comment.taskId }));
	}
);

const DeleteCommentSchemaData = z.object({
	id: z.string(),
});

/**
 * Deleting mirrors the internal `DELETE /delete-comment` handler with one
 * deliberate narrowing: the `admin.administrator` bypass is never reachable
 * through a personal key (admin.* scopes are permanently excluded from the
 * catalog), so deleting someone else's comment requires the
 * `moderation.manageComments` scope specifically. Deleting your own only needs
 * the same `tasks.comment` bar as posting one.
 */
commentsRoute.delete(
	"/comments/:commentId",
	describeOkNotFound({
		summary: "Delete Task Comment",
		description: "Delete a comment. Your own needs only membership; someone else's needs comment moderation.",
		dataSchema: DeleteCommentSchemaData,
		tags: ["Tasks"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const traceAsync = createTraceAsync();
		const principal = c.get("apiKeyPrincipal");
		if (!principal) return c.json(errorResponse("Unauthorized"), 401);

		const commentId = c.req.param("commentId");

		const comment = await traceAsync(
			"public.me.comment.delete.lookup",
			() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
			{ description: "Finding comment to delete", data: { commentId } }
		);

		if (!comment) {
			return c.json(errorResponse("Comment not found", "No comment found with the provided id"), 404);
		}

		const isAuthor = comment.createdBy === principal.userId;
		const isAuthorized = isAuthor
			? await assertApiAccess(c, comment.organizationId, "tasks.comment")
			: await assertApiAccess(c, comment.organizationId, "moderation.manageComments");

		if (!isAuthorized) {
			return c.json(
				errorResponse(
					"You don't have permission to delete this comment.",
					isAuthor
						? "You are not a member of this organization."
						: "Deleting another member's comment requires comment moderation."
				),
				403
			);
		}

		await traceAsync(
			"public.me.comment.delete.transaction",
			() =>
				db.transaction(async (tx) => {
					await tx.delete(schema.taskCommentHistory).where(eq(schema.taskCommentHistory.commentId, commentId));
					await tx.delete(schema.taskCommentReaction).where(eq(schema.taskCommentReaction.commentId, commentId));
					await tx.delete(schema.taskComment).where(eq(schema.taskComment.id, commentId));
				}),
			{ description: "Deleting comment and related data", data: { orgId: comment.organizationId, commentId } }
		);

		await traceAsync(
			"public.me.comment.delete.broadcast",
			() => broadcastCommentMutation(comment.organizationId, comment.taskId),
			{ description: "Broadcasting comment deletion to clients" }
		);

		return c.json(successResponse({ id: commentId }));
	}
);

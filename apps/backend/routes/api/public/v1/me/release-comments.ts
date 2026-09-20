import {
	createReleaseComment,
	db,
	deleteReleaseComment,
	getReleaseCommentReplies,
	getReleaseComments,
	schema,
	updateReleaseComment,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import z from "zod";
import type { AppEnv } from "@/index";
import { broadcastReleaseCommentsChanged } from "../../../../../lib/releases/broadcast";
import {
	parseCreateCommentInput,
	parseUpdateCommentInput,
	RELEASE_VISIBILITIES,
} from "../../../../../lib/releases/input";
import { withContentMarkdown } from "../../../../../lib/releases/serialize";
import { bearerAuthResponses, describeOkNotFound } from "../../../../../openapi/helpers";
import { errorResponse, paginatedSuccessResponse, successResponse } from "../../../../../responses";
import {
	guardReleaseCommentRoute,
	guardReleaseRoute,
	invalidBody,
	invalidRequest,
	readJsonBody,
} from "./release-access";
import {
	DeletedSchema,
	invalidRequestResponse,
	orgIdBodyProperty,
	orgIdQueryParam,
	ReleaseCommentSchema,
	releasePathParam,
} from "./release-schemas";
import { parsePaginationParam } from "./schemas";

const COMMENTS_DEFAULT_LIMIT = 10;
const COMMENTS_MAX_LIMIT = 50;

export const releaseCommentsRoute = new Hono<AppEnv>();

const commentPathParam = {
	name: "commentId",
	in: "path",
	required: true,
	schema: { type: "string" },
	description: "Release comment id.",
};

const visibilityProperty = {
	type: "string",
	enum: [...RELEASE_VISIBILITIES],
	description: 'Defaults to "public" when creating. "internal" is only visible to organization members.',
};

releaseCommentsRoute.get(
	"/releases/:release/comments",
	describeOkNotFound({
		summary: "List Release Comments",
		description:
			"List a release's top-level comments (paginated, oldest first), including internal ones, each with reply-thread metadata and its content as Markdown. Replies are fetched separately. Requires org membership and the tasks.read scope.",
		dataSchema: z.array(ReleaseCommentSchema),
		parameters: [
			releasePathParam,
			orgIdQueryParam,
			{
				name: "statusUpdateId",
				in: "query",
				required: false,
				schema: { type: "string" },
				description:
					'Only comments on this status update. Pass the literal "null" for comments on the release itself. Omit for both.',
			},
			{ name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
			{
				name: "limit",
				in: "query",
				schema: { type: "integer", minimum: 1, maximum: COMMENTS_MAX_LIMIT, default: COMMENTS_DEFAULT_LIMIT },
			},
		],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const guard = await guardReleaseRoute(c, {
			orgRef: c.req.query("orgId"),
			scope: "tasks.read",
			action: "read release comments",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const query = c.req.query();
		const pageParam = parsePaginationParam(query.page, "page");
		if (pageParam.error) return invalidRequest(c, pageParam.error);
		const limitParam = parsePaginationParam(query.limit, "limit");
		if (limitParam.error) return invalidRequest(c, limitParam.error);

		const page = pageParam.value ?? 1;
		const limit = Math.min(limitParam.value ?? COMMENTS_DEFAULT_LIMIT, COMMENTS_MAX_LIMIT);
		const offset = (page - 1) * limit;

		// Scoped to this release inside `getReleaseComments`, so a status update id
		// from another release simply matches nothing.
		const { comments, total } = await getReleaseComments(guard.release.id, {
			statusUpdateId: query.statusUpdateId === "null" ? null : query.statusUpdateId || undefined,
			visibility: "all",
			limit,
			offset,
			topLevelOnly: true,
		});

		const totalPages = Math.max(Math.ceil(total / limit), 1);
		return c.json(
			paginatedSuccessResponse(comments.map(withContentMarkdown), {
				limit,
				page,
				totalPages,
				totalItems: total,
				hasMore: page < totalPages,
			})
		);
	}
);

releaseCommentsRoute.post(
	"/releases/:release/comments",
	describeOkNotFound({
		summary: "Create Release Comment",
		description:
			"Comment on a release, or on one of its status updates. To reply, pass the `parentId` of a top-level comment on this release; a reply belongs to the same status update as its parent. Requires the tasks.comment scope.",
		dataSchema: ReleaseCommentSchema,
		bodySchema: {
			type: "object",
			required: ["orgId", "content"],
			properties: {
				orgId: orgIdBodyProperty,
				content: { type: "string", description: "Markdown." },
				visibility: visibilityProperty,
				statusUpdateId: { type: "string", description: "Comment on this status update of the release." },
				parentId: { type: "string", description: "Reply to this top-level comment of the release." },
			},
		},
		bodyExample: { orgId: "platform", content: "Looks good to ship." },
		parameters: [releasePathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const guard = await guardReleaseRoute(c, {
			orgRef: body.orgId,
			scope: "tasks.comment",
			action: "comment on releases",
			releaseRef: c.req.param("release"),
		});
		if (!guard.ok) return guard.response;

		const input = parseCreateCommentInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		let statusUpdateId = input.value.statusUpdateId;

		if (input.value.parentId) {
			// The reply target must be a top-level comment on THIS release.
			const parent = await db.query.releaseComment.findFirst({
				where: and(
					eq(schema.releaseComment.id, input.value.parentId),
					eq(schema.releaseComment.releaseId, guard.release.id)
				),
			});
			if (!parent) {
				return c.json(errorResponse("Comment not found", "No comment with that id exists on this release."), 404);
			}
			if (parent.parentId) {
				return invalidRequest(c, "You can only reply to a top-level comment, not to another reply.");
			}
			// A reply lives in its parent's thread.
			statusUpdateId = parent.statusUpdateId ?? undefined;
		} else if (statusUpdateId) {
			const statusUpdate = await db.query.releaseStatusUpdate.findFirst({
				where: and(
					eq(schema.releaseStatusUpdate.id, statusUpdateId),
					eq(schema.releaseStatusUpdate.releaseId, guard.release.id)
				),
				columns: { id: true },
			});
			if (!statusUpdate) {
				return c.json(
					errorResponse("Status update not found", "No status update with that id exists on this release."),
					404
				);
			}
		}

		const comment = await createReleaseComment({
			releaseId: guard.release.id,
			organizationId: guard.orgId,
			createdBy: guard.principal.userId,
			content: input.value.content,
			visibility: input.value.visibility,
			statusUpdateId,
			parentId: input.value.parentId,
		});
		broadcastReleaseCommentsChanged(guard.orgId, guard.release.id, comment.visibility);

		return c.json(successResponse(withContentMarkdown(comment)));
	}
);

/**
 * Release comments are looked up by id alone, so the org comes from the
 * comment row and the permission check runs against that org. Editing or
 * deleting someone else's comment needs `moderation.manageComments`; your own
 * only needs `tasks.comment`. This mirrors the web app's release router, and is
 * stricter than `/me` task comments (where any member can edit any comment).
 */
releaseCommentsRoute.get(
	"/release-comments/:commentId/replies",
	describeOkNotFound({
		summary: "List Release Comment Replies",
		description:
			"List the replies to a top-level release comment, oldest first, with their content as Markdown. Requires org membership and the tasks.read scope.",
		dataSchema: z.array(ReleaseCommentSchema),
		parameters: [commentPathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseCommentRoute(c, {
			commentId: c.req.param("commentId"),
			action: "read this comment's replies",
			scopeFor: () => "tasks.read",
		});
		if (!guard.ok) return guard.response;

		const replies = await getReleaseCommentReplies(guard.release.id, guard.comment.id);
		return c.json(successResponse(replies.map(withContentMarkdown)));
	}
);

releaseCommentsRoute.patch(
	"/release-comments/:commentId",
	describeOkNotFound({
		summary: "Edit Release Comment",
		description:
			"Edit a release comment's content or visibility; only the fields you send change. Your own comment needs the tasks.comment scope; someone else's needs the moderation.manageComments scope, and your role must include the Moderate comments permission.",
		dataSchema: ReleaseCommentSchema,
		bodySchema: {
			type: "object",
			properties: {
				content: { type: "string", description: "Markdown." },
				visibility: visibilityProperty,
			},
		},
		bodyExample: { content: "Updated comment." },
		parameters: [commentPathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: { ...bearerAuthResponses, ...invalidRequestResponse },
	}),
	async (c) => {
		const guard = await guardReleaseCommentRoute(c, {
			commentId: c.req.param("commentId"),
			action: "edit this comment",
			scopeFor: (comment, principal) =>
				comment.createdBy === principal.userId ? "tasks.comment" : "moderation.manageComments",
		});
		if (!guard.ok) return guard.response;

		const body = await readJsonBody(c);
		if (!body) return invalidBody(c);

		const input = parseUpdateCommentInput(body);
		if (!input.ok) return invalidRequest(c, input.error);

		const updated = await updateReleaseComment(guard.comment.id, input.value);
		broadcastReleaseCommentsChanged(guard.orgId, guard.release.id, updated.visibility);

		return c.json(successResponse(withContentMarkdown(updated)));
	}
);

releaseCommentsRoute.delete(
	"/release-comments/:commentId",
	describeOkNotFound({
		summary: "Delete Release Comment",
		description:
			"Delete a release comment, along with its replies. Your own comment needs the tasks.comment scope; someone else's needs the moderation.manageComments scope, and your role must include the Moderate comments permission.",
		dataSchema: DeletedSchema,
		parameters: [commentPathParam],
		tags: ["Releases"],
		security: [{ bearerAuth: [] }],
		extraResponses: bearerAuthResponses,
	}),
	async (c) => {
		const guard = await guardReleaseCommentRoute(c, {
			commentId: c.req.param("commentId"),
			action: "delete this comment",
			scopeFor: (comment, principal) =>
				comment.createdBy === principal.userId ? "tasks.comment" : "moderation.manageComments",
		});
		if (!guard.ok) return guard.response;

		await deleteReleaseComment(guard.comment.id);
		broadcastReleaseCommentsChanged(guard.orgId, guard.release.id, guard.comment.visibility);

		return c.json(successResponse({ id: guard.comment.id }));
	}
);

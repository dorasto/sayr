import {
	addReleaseLabel,
	createReleaseComment,
	createReleaseStatusUpdate,
	db,
	deleteReleaseComment,
	deleteReleaseStatusUpdate,
	getLabel,
	getRelease,
	getReleaseCommentReplies,
	getReleaseComments,
	getReleaseStatusUpdates,
	removeReleaseLabel,
	schema,
	updateReleaseComment,
	updateReleaseStatusUpdate,
} from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { assertMcpAccess } from "../../../lib/mcp/auth";
import {
	broadcastReleaseCommentsChanged,
	broadcastReleaseLabelsChanged,
	broadcastReleaseStatusUpdatesChanged,
} from "../../../lib/releases/broadcast";
import { loadReleaseLabels } from "../../../lib/releases/detail";
import { linkGithubPrService, unlinkGithubPrService } from "../../../lib/releases/githubPr";
import {
	parseCreateCommentInput,
	parseCreateStatusUpdateInput,
	parseUpdateCommentInput,
	parseUpdateStatusUpdateInput,
	RELEASE_HEALTHS,
	RELEASE_VISIBILITIES,
} from "../../../lib/releases/input";
import { toMarkdown } from "../../../lib/releases/serialize";
import { MARKDOWN_MENTIONS_HINT, type McpUserClaims, resolveAndRateLimitOrg, toolError, toolJson } from "../context";
import { findRelease, guard, orgArg, releaseArg, releaseFailure } from "./releases";
import { withResolvedMentions } from "../../../prosekit/resolveMarkdownMentions";

const COMMENTS_DEFAULT_LIMIT = 10;
const COMMENTS_MAX_LIMIT = 50;

/** Comments and status updates come back with their content as Markdown instead of editor JSON. */
function withMarkdown<T extends { content: schema.NodeJSON | null }>(row: T) {
	return { ...row, content: toMarkdown(row.content) };
}

function findStatusUpdateInRelease(releaseId: string, updateId: string) {
	return db.query.releaseStatusUpdate.findFirst({
		where: and(eq(schema.releaseStatusUpdate.id, updateId), eq(schema.releaseStatusUpdate.releaseId, releaseId)),
	});
}

/** Resolves a release comment within the org, then checks the author/moderator scope against it. */
async function guardReleaseComment(
	claims: McpUserClaims,
	org: string,
	commentId: string,
	action: "edit" | "delete"
): Promise<
	| { error: ReturnType<typeof toolError> }
	| { orgId: string; comment: schema.releaseCommentType; release: schema.releaseType }
> {
	const resolved = await resolveAndRateLimitOrg(claims.userId, org);
	if ("error" in resolved) return { error: toolError(resolved.error) };
	const { orgId } = resolved;

	const comment = await db.query.releaseComment.findFirst({ where: (t) => eq(t.id, commentId) });
	if (!comment || comment.organizationId !== orgId) {
		return { error: toolError(`No release comment found for "${commentId}".`) };
	}

	const isAuthor = comment.createdBy === claims.userId;
	const scope = isAuthor ? "tasks.comment" : "moderation.manageComments";
	const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, scope);
	if (!allowed) {
		return {
			error: toolError(
				isAuthor
					? `You don't have permission to ${action} comments here — the token is missing the tasks.comment scope, or you're not a member of this organization.`
					: `To ${action} another member's comment you need moderation.manageComments — the token is missing that scope, or your role in this organization doesn't allow it.`
			),
		};
	}

	const release = await getRelease(comment.releaseId);
	if (!release || release.organizationId !== orgId) {
		return { error: toolError(`No release comment found for "${commentId}".`) };
	}
	return { orgId, comment, release };
}

export function registerReleaseActivityTools(server: McpServer, claims: McpUserClaims | null) {
	/* ------------------------------ Comments ------------------------------ */

	server.registerTool(
		"list_release_comments",
		{
			title: "List release comments",
			description:
				"List a release's top-level comments (oldest first, paginated), including internal ones, with reply counts. Use list_release_comment_replies for a thread.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				statusUpdateId: z
					.string()
					.optional()
					.describe('Only comments on this status update. Pass "none" for comments on the release itself.'),
				page: z.number().int().min(1).optional().describe("Default 1."),
				limit: z.number().int().min(1).max(COMMENTS_MAX_LIMIT).optional().describe("Default 10, up to 50."),
			}),
		},
		async ({ org, release: releaseRef, statusUpdateId, page, limit }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.read", "read release comments");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const effectiveLimit = Math.min(limit ?? COMMENTS_DEFAULT_LIMIT, COMMENTS_MAX_LIMIT);
			const effectivePage = page ?? 1;
			// Scoped to this release inside getReleaseComments, so a status update id from another release matches nothing.
			const { comments, total } = await getReleaseComments(release.id, {
				statusUpdateId: statusUpdateId === "none" ? null : statusUpdateId,
				visibility: "all",
				limit: effectiveLimit,
				offset: (effectivePage - 1) * effectiveLimit,
				topLevelOnly: true,
			});

			return toolJson({ comments: comments.map(withMarkdown), totalComments: total });
		}
	);

	server.registerTool(
		"list_release_comment_replies",
		{
			title: "List release comment replies",
			description: "List the replies to a top-level release comment, oldest first.",
			inputSchema: z.object({ org: orgArg, commentId: z.string() }),
		},
		async ({ org, commentId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.read", "read release comments");
			if ("error" in g) return g.error;

			const comment = await db.query.releaseComment.findFirst({
				where: (t) => and(eq(t.id, commentId), eq(t.organizationId, g.orgId)),
			});
			if (!comment) return toolError(`No release comment found for "${commentId}".`);

			const replies = await getReleaseCommentReplies(comment.releaseId, comment.id);
			return toolJson(replies.map(withMarkdown));
		}
	);

	server.registerTool(
		"create_release_comment",
		{
			title: "Create release comment",
			description:
				"Comment on a release or one of its status updates. To reply, pass the parentId of a top-level comment on this release (a reply joins its parent's thread).",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				content: z.string().min(1).describe(`Markdown. ${MARKDOWN_MENTIONS_HINT}`),
				visibility: z
					.enum(RELEASE_VISIBILITIES)
					.optional()
					.describe('Default "public". "internal" is only visible to organization members.'),
				statusUpdateId: z.string().optional().describe("Comment on this status update of the release."),
				parentId: z.string().optional().describe("Reply to this top-level comment of the release."),
			}),
		},
		async ({ org, release: releaseRef, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.comment", "comment on releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const input = parseCreateCommentInput(fields);
			if (!input.ok) return toolError(input.error);
			input.value = await withResolvedMentions(input.value, g.orgId);

			let statusUpdateId = input.value.statusUpdateId;
			if (input.value.parentId) {
				const parent = await db.query.releaseComment.findFirst({
					where: and(
						eq(schema.releaseComment.id, input.value.parentId),
						eq(schema.releaseComment.releaseId, release.id)
					),
				});
				if (!parent) return toolError("No comment with that parentId exists on this release.");
				if (parent.parentId) return toolError("You can only reply to a top-level comment, not to another reply.");
				statusUpdateId = parent.statusUpdateId ?? undefined;
			} else if (statusUpdateId) {
				const statusUpdate = await findStatusUpdateInRelease(release.id, statusUpdateId);
				if (!statusUpdate) return toolError("No status update with that id exists on this release.");
			}

			const comment = await createReleaseComment({
				releaseId: release.id,
				organizationId: g.orgId,
				createdBy: claims.userId,
				content: input.value.content,
				visibility: input.value.visibility,
				statusUpdateId,
				parentId: input.value.parentId,
			});
			broadcastReleaseCommentsChanged(g.orgId, release.id, comment.visibility);

			return toolJson(withMarkdown(comment));
		}
	);

	server.registerTool(
		"update_release_comment",
		{
			title: "Update release comment",
			description:
				"Edit a release comment's content or visibility. Your own only needs tasks.comment; someone else's needs moderation.manageComments.",
			inputSchema: z.object({
				org: orgArg,
				commentId: z.string(),
				content: z.string().min(1).optional().describe(`Markdown. ${MARKDOWN_MENTIONS_HINT}`),
				visibility: z.enum(RELEASE_VISIBILITIES).optional(),
			}),
		},
		async ({ org, commentId, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guardReleaseComment(claims, org, commentId, "edit");
			if ("error" in g) return g.error;

			const input = parseUpdateCommentInput(fields);
			if (!input.ok) return toolError(input.error);
			input.value = await withResolvedMentions(input.value, g.orgId);

			const updated = await updateReleaseComment(g.comment.id, input.value);
			broadcastReleaseCommentsChanged(g.orgId, g.release.id, updated.visibility);

			return toolJson(withMarkdown(updated));
		}
	);

	server.registerTool(
		"delete_release_comment",
		{
			title: "Delete release comment",
			description:
				"Delete a release comment and its replies. Your own only needs tasks.comment; someone else's needs moderation.manageComments.",
			inputSchema: z.object({ org: orgArg, commentId: z.string() }),
			annotations: { destructiveHint: true },
		},
		async ({ org, commentId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guardReleaseComment(claims, org, commentId, "delete");
			if ("error" in g) return g.error;

			await deleteReleaseComment(g.comment.id);
			broadcastReleaseCommentsChanged(g.orgId, g.release.id, g.comment.visibility);

			return toolJson({ id: g.comment.id, deleted: true });
		}
	);

	/* --------------------------- Status updates --------------------------- */

	server.registerTool(
		"list_release_status_updates",
		{
			title: "List release status updates",
			description:
				"List a release's status updates, newest first, including internal ones, with author and comment count.",
			inputSchema: z.object({ org: orgArg, release: releaseArg }),
		},
		async ({ org, release: releaseRef }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "tasks.read", "read release status updates");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const updates = await getReleaseStatusUpdates(release.id, "all");
			return toolJson(updates.map(withMarkdown));
		}
	);

	server.registerTool(
		"create_release_status_update",
		{
			title: "Create release status update",
			description: "Post a status update on a release, with a health rating.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				content: z.string().optional().describe(`Markdown. ${MARKDOWN_MENTIONS_HINT}`),
				health: z.enum(RELEASE_HEALTHS).optional().describe('Default "on_track".'),
				visibility: z
					.enum(RELEASE_VISIBILITIES)
					.optional()
					.describe('Default "public". "internal" is only visible to organization members.'),
			}),
		},
		async ({ org, release: releaseRef, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "post release status updates");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const input = parseCreateStatusUpdateInput(fields);
			if (!input.ok) return toolError(input.error);
			input.value = await withResolvedMentions(input.value, g.orgId);

			const update = await createReleaseStatusUpdate({
				releaseId: release.id,
				organizationId: g.orgId,
				authorId: claims.userId,
				content: input.value.content,
				health: input.value.health,
				visibility: input.value.visibility,
			});
			broadcastReleaseStatusUpdatesChanged(g.orgId, release.id);

			return toolJson(withMarkdown(update));
		}
	);

	server.registerTool(
		"update_release_status_update",
		{
			title: "Update release status update",
			description: "Edit a status update on a release; only the fields you pass change.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				updateId: z.string().describe("Status update id (see list_release_status_updates)."),
				content: z.string().optional().describe(`Markdown. ${MARKDOWN_MENTIONS_HINT}`),
				health: z.enum(RELEASE_HEALTHS).optional(),
				visibility: z.enum(RELEASE_VISIBILITIES).optional(),
			}),
		},
		async ({ org, release: releaseRef, updateId, ...fields }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "edit release status updates");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const existing = await findStatusUpdateInRelease(release.id, updateId);
			if (!existing) return toolError("No status update with that id exists on this release.");

			const input = parseUpdateStatusUpdateInput(fields);
			if (!input.ok) return toolError(input.error);
			input.value = await withResolvedMentions(input.value, g.orgId);

			const updated = await updateReleaseStatusUpdate(existing.id, input.value);
			broadcastReleaseStatusUpdatesChanged(g.orgId, release.id);

			return toolJson(withMarkdown(updated));
		}
	);

	server.registerTool(
		"delete_release_status_update",
		{
			title: "Delete release status update",
			description: "Delete a status update from a release, along with the comments on it.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				updateId: z.string().describe("Status update id (see list_release_status_updates)."),
			}),
			annotations: { destructiveHint: true },
		},
		async ({ org, release: releaseRef, updateId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "delete release status updates");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const existing = await findStatusUpdateInRelease(release.id, updateId);
			if (!existing) return toolError("No status update with that id exists on this release.");

			await deleteReleaseStatusUpdate(existing.id);
			broadcastReleaseStatusUpdatesChanged(g.orgId, release.id);

			return toolJson({ id: existing.id, deleted: true });
		}
	);

	/* ------------------------------- Labels ------------------------------- */

	server.registerTool(
		"add_release_label",
		{
			title: "Add release label",
			description:
				"Add a label (from list_labels) to a release. Adding one it already has is a no-op. Returns the release's labels.",
			inputSchema: z.object({ org: orgArg, release: releaseArg, labelId: z.string() }),
		},
		async ({ org, release: releaseRef, labelId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "manage release labels");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const label = await getLabel(g.orgId, labelId);
			if (!label) return toolError(`No label found for "${labelId}" in this organization.`);

			await addReleaseLabel(release.id, g.orgId, label.id);
			broadcastReleaseLabelsChanged(g.orgId, release.id);

			return toolJson(await loadReleaseLabels(release));
		}
	);

	server.registerTool(
		"remove_release_label",
		{
			title: "Remove release label",
			description:
				"Remove a label from a release. Removing one it doesn't have is a no-op. Returns the remaining labels.",
			inputSchema: z.object({ org: orgArg, release: releaseArg, labelId: z.string() }),
		},
		async ({ org, release: releaseRef, labelId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "manage release labels");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			const label = await getLabel(g.orgId, labelId);
			if (!label) return toolError(`No label found for "${labelId}" in this organization.`);

			await removeReleaseLabel(release.id, label.id);
			broadcastReleaseLabelsChanged(g.orgId, release.id);

			return toolJson(await loadReleaseLabels(release));
		}
	);

	/* ---------------------------- Pull requests --------------------------- */

	server.registerTool(
		"link_release_pull_request",
		{
			title: "Link release pull request",
			description:
				"Link a GitHub pull request to a release by its URL. The repository must be connected to this organization. Linking one already linked here is a no-op.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				prUrl: z.string().min(1).describe("e.g. https://github.com/owner/repo/pull/123"),
			}),
		},
		async ({ org, release: releaseRef, prUrl }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "link pull requests to releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			try {
				const { body: _body, ...pullRequest } = await linkGithubPrService({ orgId: g.orgId, release, prUrl });
				return toolJson(pullRequest);
			} catch (err) {
				return releaseFailure(err, "Failed to link the pull request.");
			}
		}
	);

	server.registerTool(
		"unlink_release_pull_request",
		{
			title: "Unlink release pull request",
			description:
				"Unlink a pull request from a release. Pass the pull request's id from get_release's githubPullRequests.",
			inputSchema: z.object({
				org: orgArg,
				release: releaseArg,
				pullRequestId: z.string().describe("The linked pull request's id (from get_release)."),
			}),
		},
		async ({ org, release: releaseRef, pullRequestId }) => {
			if (!claims) return toolError("Unauthorized.");
			const g = await guard(claims, org, "content.manageReleases", "unlink pull requests from releases");
			if ("error" in g) return g.error;

			const release = await findRelease(g.orgId, releaseRef);
			if (!release) return toolError(`No release found for "${releaseRef}" in this organization.`);

			try {
				const unlinked = await unlinkGithubPrService({ orgId: g.orgId, release, githubPRId: pullRequestId });
				if (!unlinked) return toolError("No pull request with that id is linked to this release.");
				return toolJson({ id: pullRequestId, unlinked: true });
			} catch (err) {
				return releaseFailure(err, "Failed to unlink the pull request.");
			}
		}
	);
}

import { randomUUID } from "node:crypto";
import {
	addReleaseCommentReaction,
	addReleaseLabel,
	createRelease,
	createReleaseComment,
	createReleaseStatusUpdate,
	db,
	deleteRelease,
	deleteReleaseComment,
	deleteReleaseStatusUpdate,
	getRelease,
	getReleaseBySlug,
	getReleaseCommentReplies,
	getReleaseComments,
	getReleaseStatusUpdates,
	getReleaseWithTasks,
	markReleaseAsReleased,
	removeReleaseCommentReaction,
	removeReleaseLabel,
	schema,
	updateRelease,
	updateReleaseComment,
	updateReleaseStatusUpdate,
} from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { findClientBysseId, sseBroadcastPublic, sseBroadcastToRoom } from "@/routes/events";
import { ServerEventBaseMessage } from "@/routes/events/types";
import { enforceLimit, traceOrgPermissionCheck } from "@/util";
import { eq } from "drizzle-orm";
import { canCreateResource, getLimitReachedMessage } from "@repo/edition";

export const apiRouteAdminRelease = new Hono<AppEnv>();

// Create a new release
apiRouteAdminRelease.post("/create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, sseClientId, name, slug, description, status, targetDate, color, icon } = await c.req.json();

	// Only members with manageReleases can create releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to create releases." }, 401);
	}
	const releaseLimitRes = await enforceLimit({
		c,
		limitKey: "releases",
		table: schema.release,
		traceName: "release.count_all",
		entityName: "release",
		traceAsync,
		recordWideError
	});
	if (releaseLimitRes) return releaseLimitRes;

	// Validate required fields
	if (!name || !slug) {
		await recordWideError({
			name: "release.create.validation",
			error: new Error("Missing required fields"),
			code: "INVALID_REQUEST",
			message: "Name and slug are required",
			contextData: { hasName: !!name, hasSlug: !!slug },
		});
		return c.json({ success: false, error: "Name and slug are required" }, 400);
	}

	// Check if slug is already taken
	const existingRelease = await traceAsync("release.create.check_slug", () => getReleaseBySlug(orgId, slug), {
		description: "Checking if slug is taken",
		data: { slug, orgId },
	});

	if (existingRelease) {
		await recordWideError({
			name: "release.create.slug_taken",
			error: new Error("Slug already taken"),
			code: "SLUG_TAKEN",
			message: "Release slug is already taken",
			contextData: { slug, orgId },
		});
		return c.json({ success: false, error: "Release slug is already taken" }, 400);
	}

	// Plan-level release limit
	const releaseOrg = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
		columns: { plan: true },
	});
	const existingReleases = await db.query.release.findMany({
		where: eq(schema.release.organizationId, orgId),
		columns: { id: true },
	});
	if (!canCreateResource("releases", existingReleases.length, releaseOrg?.plan)) {
		return c.json({ success: false, error: getLimitReachedMessage("releases", releaseOrg?.plan) }, 403);
	}

	// Create the release
	const releaseId = randomUUID();
	const release = await traceAsync(
		"release.create.insert",
		() =>
			createRelease({
				id: releaseId,
				organizationId: orgId,
				name,
				slug,
				description,
				status: status || "planned",
				targetDate: targetDate ? new Date(targetDate) : undefined,
				color,
				icon,
				createdBy: session?.userId,
			}),
		{
			description: "Creating release record",
			data: { orgId, name, slug, status },
		}
	);

	if (!release) {
		await recordWideError({
			name: "release.create.failed",
			error: new Error("Release creation failed"),
			code: "RELEASE_CREATION_FAILED",
			message: "Failed to create release in database",
			contextData: { orgId, name, slug },
		});
		return c.json({ success: false, error: "Failed to create release" }, 500);
	}

	// Broadcast the update
	await traceAsync(
		"release.create.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"],
				data: release,
			};

			sseBroadcastToRoom(orgId, "releases", data, found?.id);
			sseBroadcastPublic(orgId, { ...data });
		},
		{ description: "Broadcasting new release to clients" }
	);

	return c.json({ success: true, data: release });
});

// Update an existing release
apiRouteAdminRelease.patch("/update", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, sseClientId, release_id: releaseId, ...updates } = await c.req.json();

	// Only members with manageReleases can update releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to update releases." }, 401);
	}

	// Check if release exists
	const existingRelease = await traceAsync("release.update.lookup", () => getRelease(releaseId), {
		description: "Finding release to update",
		data: { orgId, releaseId },
	});

	if (!existingRelease || existingRelease.organizationId !== orgId) {
		await recordWideError({
			name: "release.update.notfound",
			error: new Error("Release not found"),
			code: "RELEASE_NOT_FOUND",
			message: "Release not found in database",
			contextData: { orgId, releaseId },
		});
		return c.json({ success: false, error: "Release not found" }, 404);
	}

	// If slug is being updated, check if it's available
	if (updates.slug && updates.slug !== existingRelease.slug) {
		const slugTaken = await traceAsync("release.update.check_slug", () => getReleaseBySlug(orgId, updates.slug), {
			description: "Checking if new slug is taken",
			data: { slug: updates.slug, orgId },
		});

		if (slugTaken) {
			await recordWideError({
				name: "release.update.slug_taken",
				error: new Error("Slug already taken"),
				code: "SLUG_TAKEN",
				message: "Release slug is already taken",
				contextData: { slug: updates.slug, orgId },
			});
			return c.json({ success: false, error: "Release slug is already taken" }, 400);
		}
	}

	// Prepare update data
	const updateData: Partial<{
		name: string;
		slug: string;
		description: schema.NodeJSON;
		status: "planned" | "in-progress" | "released" | "archived";
		targetDate: Date | null;
		releasedAt: Date | null;
		color: string;
		icon: string;
		leadId: string | null;
	}> = {};

	// Only include allowed fields
	if (updates.name !== undefined) updateData.name = updates.name;
	if (updates.slug !== undefined) updateData.slug = updates.slug;
	if (updates.description !== undefined) updateData.description = updates.description;
	if (updates.status !== undefined) updateData.status = updates.status;
	if (updates.targetDate !== undefined)
		updateData.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
	if (updates.releasedAt !== undefined)
		updateData.releasedAt = updates.releasedAt ? new Date(updates.releasedAt) : null;
	if (updates.color !== undefined) updateData.color = updates.color;
	if (updates.icon !== undefined) updateData.icon = updates.icon;
	if ("leadId" in updates) updateData.leadId = updates.leadId ?? null;

	// Update the release
	const updatedRelease = await traceAsync("release.update.save", () => updateRelease(releaseId, updateData), {
		description: "Updating release record",
		data: { releaseId, updates: Object.keys(updateData) },
	});

	if (!updatedRelease) {
		await recordWideError({
			name: "release.update.failed",
			error: new Error("Release update failed"),
			code: "RELEASE_UPDATE_FAILED",
			message: "Failed to update release in database",
			contextData: { releaseId, updateData },
		});
		return c.json({ success: false, error: "Failed to update release" }, 500);
	}

	// Broadcast the update
	await traceAsync(
		"release.update.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"],
				data: updatedRelease,
			};

			sseBroadcastToRoom(orgId, "releases", data, found?.id);
			sseBroadcastPublic(orgId, { ...data });
		},
		{ description: "Broadcasting updated release to clients" }
	);

	return c.json({ success: true, data: updatedRelease });
});

// Delete a release
apiRouteAdminRelease.delete("/delete", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, sseClientId, release_id: releaseId } = await c.req.json();

	// Only members with manageReleases can delete releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to delete releases." }, 401);
	}

	// Check if release exists
	const existingRelease = await traceAsync("release.delete.lookup", () => getRelease(releaseId), {
		description: "Finding release to delete",
		data: { orgId, releaseId },
	});

	if (!existingRelease || existingRelease.organizationId !== orgId) {
		await recordWideError({
			name: "release.delete.notfound",
			error: new Error("Release not found"),
			code: "RELEASE_NOT_FOUND",
			message: "Release not found in database",
			contextData: { orgId, releaseId },
		});
		return c.json({ success: false, error: "Release not found" }, 404);
	}

	// Delete the release (this also nullifies tasks' releaseId)
	await traceAsync("release.delete.remove", () => deleteRelease(releaseId), {
		description: "Deleting release and nullifying task associations",
		data: { releaseId },
	});

	// Broadcast the deletion
	await traceAsync(
		"release.delete.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "DELETE_RELEASE" as ServerEventBaseMessage["type"],
				data: { releaseId },
			};

			sseBroadcastToRoom(orgId, "releases", data, found?.id);
			sseBroadcastPublic(orgId, { ...data });

			// Also broadcast task updates since their releaseId was nullified
			const taskUpdateData = {
				type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
				data: { releaseId: null },
			};
			sseBroadcastToRoom(orgId, "tasks", taskUpdateData, found?.id);
		},
		{ description: "Broadcasting release deletion to clients" }
	);

	return c.json({ success: true });
});

// Mark release as released (auto-closes incomplete tasks)
apiRouteAdminRelease.post("/mark-released", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, sseClientId, release_id: releaseId } = await c.req.json();

	// Only members with manageReleases can mark releases as released
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to mark releases as released." }, 401);
	}

	if (!session?.userId) {
		await recordWideError({
			name: "release.mark_released.auth",
			error: new Error("User not authenticated"),
			code: "UNAUTHORIZED",
			message: "User not authenticated",
			contextData: {},
		});
		return c.json({ success: false, error: "You must be authenticated to perform this action." }, 401);
	}

	// Check if release exists
	const existingRelease = await traceAsync("release.mark_released.lookup", () => getRelease(releaseId), {
		description: "Finding release to mark as released",
		data: { orgId, releaseId },
	});

	if (!existingRelease || existingRelease.organizationId !== orgId) {
		await recordWideError({
			name: "release.mark_released.notfound",
			error: new Error("Release not found"),
			code: "RELEASE_NOT_FOUND",
			message: "Release not found in database",
			contextData: { orgId, releaseId },
		});
		return c.json({ success: false, error: "Release not found" }, 404);
	}

	// Mark as released and auto-close tasks
	const result = await traceAsync(
		"release.mark_released.execute",
		() => markReleaseAsReleased(releaseId, session.userId),
		{
			description: "Marking release as released and closing incomplete tasks",
			data: { releaseId, actorId: session.userId },
		}
	);

	if (!result) {
		await recordWideError({
			name: "release.mark_released.failed",
			error: new Error("Failed to mark release as released"),
			code: "RELEASE_MARK_RELEASED_FAILED",
			message: "Failed to mark release as released",
			contextData: { releaseId },
		});
		return c.json({ success: false, error: "Failed to mark release as released" }, 500);
	}

	// Create timeline entries for auto-closed tasks
	await traceAsync(
		"release.mark_released.timeline",
		async () => {
			for (const taskId of result.updatedTaskIds) {
				await db.insert(schema.taskTimeline).values({
					taskId,
					organizationId: orgId,
					eventType: "status_change",
					actorId: session.userId,
					fromValue: null, // Previous status will vary
					toValue: "done",
					content: {
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: `Task auto-closed when release "${existingRelease.name}" was marked as released`,
									},
								],
							},
						],
					},
				});
			}
		},
		{
			description: "Creating timeline entries for auto-closed tasks",
			data: { taskCount: result.updatedTaskIds.length },
		}
	);

	// Broadcast the updates
	await traceAsync(
		"release.mark_released.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);

			// Broadcast release update
			const releaseData = {
				type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"],
				data: result.release,
			};
			sseBroadcastToRoom(orgId, "releases", releaseData, found?.id);
			sseBroadcastPublic(orgId, { ...releaseData });

			// Broadcast task updates for auto-closed tasks
			if (result.updatedTaskIds.length > 0) {
				const taskData = {
					type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
					data: { taskIds: result.updatedTaskIds, status: "done" },
				};
				sseBroadcastToRoom(orgId, "tasks", taskData, found?.id);
			}
		},
		{ description: "Broadcasting release and task updates to clients" }
	);

	return c.json({
		success: true,
		data: {
			release: result.release,
			updatedTaskCount: result.updatedTaskIds.length,
		},
	});
});

// Get release with tasks
apiRouteAdminRelease.get("/:releaseId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const releaseId = c.req.param("releaseId");
	const orgId = c.req.query("org_id");

	if (!orgId) {
		return c.json({ success: false, error: "Organization ID is required" }, 400);
	}

	// Check if user has permission to view organization
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to view this release." }, 401);
	}

	// Fetch release with tasks
	const release = await traceAsync("release.get.fetch", () => getReleaseWithTasks(releaseId), {
		description: "Fetching release with tasks",
		data: { releaseId },
	});

	if (!release || release.organizationId !== orgId) {
		await recordWideError({
			name: "release.get.notfound",
			error: new Error("Release not found"),
			code: "RELEASE_NOT_FOUND",
			message: "Release not found in database",
			contextData: { orgId, releaseId },
		});
		return c.json({ success: false, error: "Release not found" }, 404);
	}

	return c.json({ success: true, data: release });
});

// ─── Release Labels ───────────────────────────────────────────────────────────

// POST /release/:releaseId/labels  — add a label
apiRouteAdminRelease.post("/:releaseId/labels", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const { org_id: orgId, sseClientId, labelId } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const existing = await getRelease(releaseId);
	if (!existing || existing.organizationId !== orgId) return c.json({ success: false, error: "Release not found" }, 404);

	await addReleaseLabel(releaseId, orgId, labelId);

	const data = { type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"], data: { releaseId } };
	const found = findClientBysseId(sseClientId);
	sseBroadcastToRoom(orgId, "releases", data, found?.id);

	return c.json({ success: true });
});

// DELETE /release/:releaseId/labels/:labelId — remove a label
apiRouteAdminRelease.delete("/:releaseId/labels/:labelId", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const labelId = c.req.param("labelId");
	const orgId = c.req.query("org_id") || "";

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	await removeReleaseLabel(releaseId, labelId);

	return c.json({ success: true });
});

// ─── Release Status Updates ───────────────────────────────────────────────────

// GET /release/:releaseId/status-updates
apiRouteAdminRelease.get("/:releaseId/status-updates", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const orgId = c.req.query("org_id") || "";

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const updates = await getReleaseStatusUpdates(releaseId, "all");
	return c.json({ success: true, data: updates });
});

// POST /release/:releaseId/status-updates
apiRouteAdminRelease.post("/:releaseId/status-updates", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const { org_id: orgId, sseClientId, content, health, visibility } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);

	const update = await createReleaseStatusUpdate({
		releaseId,
		organizationId: orgId,
		authorId: session.userId,
		content,
		health: health || "on_track",
		visibility: visibility || "public",
	});

	const found = findClientBysseId(sseClientId);
	const data = { type: "UPDATE_RELEASE_STATUS_UPDATES" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data, found?.id);
	sseBroadcastPublic(orgId, { ...data });

	return c.json({ success: true, data: update });
});

// PATCH /release/:releaseId/status-updates/:updateId
apiRouteAdminRelease.patch("/:releaseId/status-updates/:updateId", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const updateId = c.req.param("updateId");
	const { org_id: orgId, sseClientId, content, health, visibility } = await c.req.json();

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const updated = await updateReleaseStatusUpdate(updateId, { content, health, visibility });

	const found = findClientBysseId(sseClientId);
	const data = { type: "UPDATE_RELEASE_STATUS_UPDATES" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data, found?.id);
	sseBroadcastPublic(orgId, { ...data });

	return c.json({ success: true, data: updated });
});

// DELETE /release/:releaseId/status-updates/:updateId
apiRouteAdminRelease.delete("/:releaseId/status-updates/:updateId", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const updateId = c.req.param("updateId");
	const orgId = c.req.query("org_id") || "";

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "content.manageReleases");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	await deleteReleaseStatusUpdate(updateId);

	const data = { type: "UPDATE_RELEASE_STATUS_UPDATES" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data);
	sseBroadcastPublic(orgId, { ...data });

	return c.json({ success: true });
});

// ─── Release Comments ─────────────────────────────────────────────────────────

// GET /release/:releaseId/comments
apiRouteAdminRelease.get("/:releaseId/comments", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const orgId = c.req.query("org_id") || "";
	const statusUpdateId = c.req.query("statusUpdateId");
	const limitParam = c.req.query("limit");
	const pageParam = c.req.query("page");
	const directionParam = c.req.query("direction");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const limit = Math.min(Number(limitParam) || 10, 50);
	const page = Math.max(Number(pageParam) || 1, 1);
	const offset = (page - 1) * limit;

	const { comments, total } = await getReleaseComments(releaseId, {
		statusUpdateId: statusUpdateId === "null" ? null : statusUpdateId,
		visibility: "all",
		limit,
		offset,
		direction: directionParam === "desc" ? "desc" : directionParam === "asc" ? "asc" : undefined,
		topLevelOnly: true,
	});

	const totalPages = Math.max(Math.ceil(total / limit), 1);

	return c.json({
		success: true,
		data: comments,
		pagination: {
			page,
			limit,
			total,
			totalPages,
			hasMore: page < totalPages,
		},
	});
});

// GET /release/:releaseId/comments/:commentId/replies
apiRouteAdminRelease.get("/:releaseId/comments/:commentId/replies", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const commentId = c.req.param("commentId");
	const orgId = c.req.query("org_id") || "";

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const replies = await getReleaseCommentReplies(releaseId, commentId);

	return c.json({ success: true, data: replies });
});

// POST /release/:releaseId/comments
apiRouteAdminRelease.post("/:releaseId/comments", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const { org_id: orgId, sseClientId, content, visibility, statusUpdateId, parentId } = await c.req.json();

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "members");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	const comment = await createReleaseComment({
		releaseId,
		organizationId: orgId,
		createdBy: session.userId,
		content,
		visibility: visibility || "public",
		statusUpdateId: statusUpdateId || undefined,
		parentId: parentId || undefined,
	});

	const found = findClientBysseId(sseClientId);
	const data = { type: "UPDATE_RELEASE_COMMENTS" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data, found?.id);
	if (visibility === "public") {
		sseBroadcastPublic(orgId, { ...data });
	}

	return c.json({ success: true, data: comment });
});

// PATCH /release/:releaseId/comments/:commentId
apiRouteAdminRelease.patch("/:releaseId/comments/:commentId", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const commentId = c.req.param("commentId");
	const { org_id: orgId, sseClientId, content, visibility } = await c.req.json();

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);

	const existingComment = await db.query.releaseComment.findFirst({ where: eq(schema.releaseComment.id, commentId) });
	if (!existingComment) return c.json({ success: false, error: "Comment not found" }, 404);

	const isOwner = existingComment.createdBy === session.userId;
	const canManage = await traceOrgPermissionCheck(session.userId, orgId, "moderation.manageComments");
	if (!isOwner && !canManage) return c.json({ success: false, error: "Permission denied" }, 401);

	const updated = await updateReleaseComment(commentId, { content, visibility });

	const found = findClientBysseId(sseClientId);
	const data = { type: "UPDATE_RELEASE_COMMENTS" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data, found?.id);
	if (updated.visibility === "public") {
		sseBroadcastPublic(orgId, { ...data });
	}

	return c.json({ success: true, data: updated });
});

// DELETE /release/:releaseId/comments/:commentId
apiRouteAdminRelease.delete("/:releaseId/comments/:commentId", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const commentId = c.req.param("commentId");
	const orgId = c.req.query("org_id") || "";

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);

	const existingComment = await db.query.releaseComment.findFirst({ where: eq(schema.releaseComment.id, commentId) });
	if (!existingComment) return c.json({ success: false, error: "Comment not found" }, 404);

	const isOwner = existingComment.createdBy === session.userId;
	const canManage = await traceOrgPermissionCheck(session.userId, orgId, "moderation.manageComments");
	if (!isOwner && !canManage) return c.json({ success: false, error: "Permission denied" }, 401);

	await deleteReleaseComment(commentId);

	const data = { type: "UPDATE_RELEASE_COMMENTS" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data);
	if (existingComment.visibility === "public") {
		sseBroadcastPublic(orgId, { ...data });
	}

	return c.json({ success: true });
});

// ─── Release Comment Reactions ────────────────────────────────────────────────

// POST /release/:releaseId/comments/:commentId/reactions
apiRouteAdminRelease.post("/:releaseId/comments/:commentId/reactions", async (c) => {
	const session = c.get("session");
	const releaseId = c.req.param("releaseId");
	const commentId = c.req.param("commentId");
	const { org_id: orgId, sseClientId, emoji } = await c.req.json();

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);
	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "members");
	if (!isAuthorized) return c.json({ success: false, error: "Permission denied" }, 401);

	await addReleaseCommentReaction(orgId, commentId, session.userId, emoji);

	const found = findClientBysseId(sseClientId);
	const data = { type: "UPDATE_RELEASE_COMMENTS" as ServerEventBaseMessage["type"], data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", data, found?.id);

	return c.json({ success: true });
});

// DELETE /release/:releaseId/comments/:commentId/reactions/:emoji
apiRouteAdminRelease.delete("/:releaseId/comments/:commentId/reactions/:emoji", async (c) => {
	const session = c.get("session");
	const commentId = c.req.param("commentId");
	const emoji = c.req.param("emoji");

	if (!session?.userId) return c.json({ success: false, error: "Unauthorized" }, 401);

	await removeReleaseCommentReaction(commentId, session.userId, emoji);

	return c.json({ success: true });
});

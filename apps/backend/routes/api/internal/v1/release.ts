import { randomUUID } from "node:crypto";
import {
	createRelease,
	db,
	deleteRelease,
	getRelease,
	getReleaseBySlug,
	getReleaseWithTasks,
	markReleaseAsReleased,
	schema,
	updateRelease,
} from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { broadcast, broadcastPublic, findClientByWsId } from "../../../ws";
import type { WSBaseMessage } from "../../../ws/types";
import { enforceLimit, traceOrgPermissionCheck } from "@/util";
import { eq } from "drizzle-orm";
import { canCreateResource, getLimitReachedMessage } from "@repo/edition";

export const apiRouteAdminRelease = new Hono<AppEnv>();

// Create a new release
apiRouteAdminRelease.post("/create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	const { org_id: orgId, wsClientId, name, slug, description, status, targetDate, color, icon } = await c.req.json();

	// Only org admins can create releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

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
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_RELEASES" as WSBaseMessage["type"],
				data: release,
			};

			broadcast(orgId, "releases", data, found?.socket);
			broadcastPublic(orgId, { ...data });
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

	const { org_id: orgId, wsClientId, release_id: releaseId, ...updates } = await c.req.json();

	// Only org admins can update releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

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
		color: string;
		icon: string;
	}> = {};

	// Only include allowed fields
	if (updates.name !== undefined) updateData.name = updates.name;
	if (updates.slug !== undefined) updateData.slug = updates.slug;
	if (updates.description !== undefined) updateData.description = updates.description;
	if (updates.status !== undefined) updateData.status = updates.status;
	if (updates.targetDate !== undefined)
		updateData.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
	if (updates.color !== undefined) updateData.color = updates.color;
	if (updates.icon !== undefined) updateData.icon = updates.icon;

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
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_RELEASES" as WSBaseMessage["type"],
				data: updatedRelease,
			};

			broadcast(orgId, "releases", data, found?.socket);
			broadcastPublic(orgId, { ...data });
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

	const { org_id: orgId, wsClientId, release_id: releaseId } = await c.req.json();

	// Only org admins can delete releases
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

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
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "DELETE_RELEASE" as WSBaseMessage["type"],
				data: { releaseId },
			};

			broadcast(orgId, "releases", data, found?.socket);
			broadcastPublic(orgId, { ...data });

			// Also broadcast task updates since their releaseId was nullified
			const taskUpdateData = {
				type: "UPDATE_TASK" as WSBaseMessage["type"],
				data: { releaseId: null },
			};
			broadcast(orgId, "tasks", taskUpdateData, found?.socket);
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

	const { org_id: orgId, wsClientId, release_id: releaseId } = await c.req.json();

	// Only org admins can mark releases as released
	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.manageMembers");

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
			const found = findClientByWsId(wsClientId);

			// Broadcast release update
			const releaseData = {
				type: "UPDATE_RELEASES" as WSBaseMessage["type"],
				data: result.release,
			};
			broadcast(orgId, "releases", releaseData, found?.socket);
			broadcastPublic(orgId, { ...releaseData });

			// Broadcast task updates for auto-closed tasks
			if (result.updatedTaskIds.length > 0) {
				const taskData = {
					type: "UPDATE_TASK" as WSBaseMessage["type"],
					data: { taskIds: result.updatedTaskIds, status: "done" },
				};
				broadcast(orgId, "tasks", taskData, found?.socket);
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

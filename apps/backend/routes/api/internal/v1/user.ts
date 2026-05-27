import { auth, db, getUsersByIds, schema, searchUsers, getOrgMemberUserIds, getTaskParticipantUserIds } from "@repo/database";
import { createTraceAsync, getTraceContext } from "@repo/opentelemetry/trace";
import { removeObject, uploadObject, deleteFolder } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { enqueue, getRedis } from "@repo/queue";
import { auth as betterAuth } from "@repo/auth";

export const apiRouteAdminUser = new Hono<AppEnv>();

const MENTION_MEMBERS_TTL = 300; // 5 minutes
const MENTION_USER_TTL = 1800; // 30 minutes

/**
 * Global user search for @mention autocomplete.
 * Returns users in tiers: task participants first, org members second, all other users third.
 * Uses Redis caching for org members and task participants to reduce DB load.
 */
apiRouteAdminUser.get("/search", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const query = c.req.query("query");
	const orgId = c.req.query("orgId");
	const taskId = c.req.query("taskId");
	const limitParam = c.req.query("limit");
	const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

	try {
		const redis = getRedis();
		let tier1Users: schema.UserSummary[] = []; // Task participants
		let tier2Users: schema.UserSummary[] = []; // Org members

		// Tier 1: Task participants (if taskId provided)
		if (taskId) {
			const cacheKey = `mention:participants:${taskId}`;
			let cachedParticipants: schema.UserSummary[] | null = null;

			try {
				const cached = await redis.get(cacheKey);
				if (cached) {
					cachedParticipants = JSON.parse(cached) as schema.UserSummary[];
				}
			} catch {
				// Cache miss or parse error, will fetch from DB
			}

			if (!cachedParticipants) {
				const participantIds = await traceAsync(
					"mention.task_participants",
					() => getTaskParticipantUserIds(taskId),
					{ description: "Getting task participant IDs", data: { taskId } }
				);

				if (participantIds.length > 0) {
					cachedParticipants = await traceAsync(
						"mention.task_participants.resolve",
						() => getUsersByIds(participantIds),
						{ description: "Resolving task participant IDs", data: { count: participantIds.length } }
					);

					// Cache for 5 minutes
					try {
						await redis.set(cacheKey, JSON.stringify(cachedParticipants), "EX", MENTION_MEMBERS_TTL);
					} catch {
						// Redis error, continue without caching
					}
				} else {
					cachedParticipants = [];
				}
			}

			// Filter by query if provided
			if (query) {
				const lowerQuery = query.toLowerCase();
				tier1Users = cachedParticipants.filter((u) =>
					u.name.toLowerCase().includes(lowerQuery) ||
					u.displayName?.toLowerCase().includes(lowerQuery)
				);
			} else {
				tier1Users = cachedParticipants;
			}
		}

		// Tier 2: Org members (if orgId provided)
		if (orgId) {
			const cacheKey = `mention:members:${orgId}`;
			let cachedMembers: schema.UserSummary[] | null = null;

			try {
				const cached = await redis.get(cacheKey);
				if (cached) {
					cachedMembers = JSON.parse(cached) as schema.UserSummary[];
				}
			} catch {
				// Cache miss or parse error, will fetch from DB
			}

			if (!cachedMembers) {
				const memberIds = await traceAsync(
					"mention.org_members",
					() => getOrgMemberUserIds(orgId),
					{ description: "Getting org member IDs", data: { orgId } }
				);

				if (memberIds.length > 0) {
					cachedMembers = await traceAsync(
						"mention.org_members.resolve",
						() => getUsersByIds(memberIds),
						{ description: "Resolving org member IDs", data: { count: memberIds.length } }
					);

					// Cache for 5 minutes
					try {
						await redis.set(cacheKey, JSON.stringify(cachedMembers), "EX", MENTION_MEMBERS_TTL);
					} catch {
						// Redis error, continue without caching
					}
				} else {
					cachedMembers = [];
				}
			}

			// Filter by query if provided, exclude tier1 users
			const tier1Ids = new Set(tier1Users.map((u) => u.id));
			if (query) {
				const lowerQuery = query.toLowerCase();
				tier2Users = cachedMembers.filter((u) =>
					!tier1Ids.has(u.id) &&
					(u.name.toLowerCase().includes(lowerQuery) ||
						u.displayName?.toLowerCase().includes(lowerQuery))
				);
			} else {
				tier2Users = cachedMembers.filter((u) => !tier1Ids.has(u.id));
			}
		}

		// Tier 3: All other users (search across entire user table)
		let tier3Users: schema.UserSummary[] = [];
		const remainingSlots = limit - tier1Users.length - tier2Users.length;

		if (remainingSlots > 0 && query && query.length >= 2) {
			const excludeIds = [
				...tier1Users.map((u) => u.id),
				...tier2Users.map((u) => u.id),
			];

			tier3Users = await traceAsync(
				"mention.global_search",
				() => searchUsers({
					query,
					limit: remainingSlots,
					excludeIds,
				}),
				{ description: "Searching all users", data: { query, excludeCount: excludeIds.length } }
			);
		}

		// Combine tiers and return
		const results = [...tier1Users, ...tier2Users, ...tier3Users].slice(0, limit);

		return c.json({ success: true, data: results });
	} catch (err) {
		await recordWideError({
			name: "user.search.failed",
			error: err,
			code: "USER_SEARCH_FAILED",
			message: "Failed to search users",
			contextData: { query, orgId, taskId },
		});
		return c.json({ success: false, error: "Failed to search users" }, 500);
	}
});

/**
 * Resolve user IDs to UserSummary objects.
 * Used by MentionView to render mention chips for any user by ID.
 * Now includes Redis caching per user for faster readonly rendering.
 */
apiRouteAdminUser.post("/resolve", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => null);
	if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
		return c.json({ success: false, error: "ids array is required" }, 400);
	}

	// Cap at 50 to prevent abuse
	const ids = body.ids.slice(0, 50) as string[];

	try {
		const redis = getRedis();
		const cachedUsers: schema.UserSummary[] = [];
		const missingIds: string[] = [];

		// Check Redis cache for each user ID
		for (const id of ids) {
			const cacheKey = `mention:user:${id}`;
			try {
				const cached = await redis.get(cacheKey);
				if (cached) {
					const user = JSON.parse(cached) as schema.UserSummary;
					cachedUsers.push(user);
				} else {
					missingIds.push(id);
				}
			} catch {
				missingIds.push(id);
			}
		}

		// Fetch missing users from DB
		let dbUsers: schema.UserSummary[] = [];
		if (missingIds.length > 0) {
			dbUsers = await traceAsync(
				"user.resolve",
				() => getUsersByIds(missingIds),
				{
					description: "Resolving user IDs to summaries",
					data: { count: missingIds.length },
				},
			);

			// Cache each resolved user
			for (const user of dbUsers) {
				const cacheKey = `mention:user:${user.id}`;
				try {
					await redis.set(cacheKey, JSON.stringify(user), "EX", MENTION_USER_TTL);
				} catch {
					// Redis error, continue without caching
				}
			}
		}

		// Combine cached and freshly resolved users
		const users = [...cachedUsers, ...dbUsers];
		return c.json({ success: true, data: users });
	} catch (err) {
		await recordWideError({
			name: "user.resolve.failed",
			error: err,
			code: "USER_RESOLVE_FAILED",
			message: "Failed to resolve user IDs",
			contextData: { ids },
		});
		return c.json({ success: false, error: "Failed to resolve users" }, 500);
	}
});

/**
 * Update user profile (currently supports displayName)
 */
apiRouteAdminUser.patch("/update", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => null);

	if (!body) {
		return c.json({ success: false, error: "Invalid request body" }, 400);
	}

	const { displayName } = body;

	// Validate displayName if provided
	if (displayName !== undefined) {
		if (typeof displayName !== "string" || displayName.trim().length === 0) {
			return c.json({ success: false, error: "Display name cannot be empty" }, 400);
		}
	}

	try {
		const [updated] = await traceAsync(
			"user.update",
			() =>
				db
					.update(auth.user)
					.set({
						...(displayName !== undefined && { displayName: displayName.trim() }),
						updatedAt: new Date(),
					})
					.where(eq(auth.user.id, session.userId))
					.returning(),
			{
				description: "Updating user profile",
				data: { userId: session.userId },
			}
		);

		if (!updated) {
			await recordWideError({
				name: "user.update.not_found",
				error: new Error("User not found"),
				code: "USER_NOT_FOUND",
				message: "Failed to update user - user not found",
				contextData: { userId: session.userId },
			});
			return c.json({ success: false, error: "User not found" }, 404);
		}

		return c.json({ success: true, data: updated });
	} catch (err) {
		await recordWideError({
			name: "user.update.failed",
			error: err,
			code: "USER_UPDATE_FAILED",
			message: "Failed to update user profile",
			contextData: { userId: session.userId },
		});
		return c.json({ success: false, error: "Failed to update user" }, 500);
	}
});

/**
 * Upload user profile picture and update image field in database
 */
apiRouteAdminUser.put("/profile-picture", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const oldImage = c.req.header("X-old-file");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.parseBody();
	const file = body.file;

	if (!file || !(file instanceof File)) {
		await recordWideError({
			name: "user.profile_picture.validation",
			error: new Error("No file uploaded"),
			code: "NO_FILE",
			message: "No file uploaded for profile picture",
			contextData: { userId: session.userId },
		});
		return c.json({ success: false, error: "No file uploaded" }, 400);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
	const objectName = `/avatar.${ext}`;

	// Remove old image if exists
	if (oldImage) {
		await traceAsync(
			"user.profile_picture.remove_old",
			() => removeObject(`profile/${session.userId}/${getFileNameFromUrl(oldImage)}`),
			{
				description: "Removing old profile picture",
				data: {
					user: { id: session.userId },
					image: oldImage,
				},
			}
		);
	}

	// Upload new image
	const imagePath = await traceAsync(
		"user.profile_picture.upload",
		() =>
			uploadObject(objectName, buffer, `profile/${session.userId}`, {
				"Content-Type": file.type || "application/octet-stream",
				originalName: objectName,
			}),
		{
			description: "Uploading user profile picture",
			data: { userId: session.userId, objectName, fileType: file.type },
			onSuccess: () => ({
				description: "User profile picture uploaded successfully",
				data: { user: { id: session.userId } },
			}),
		}
	);

	// Convert storage path to CDN URL
	const imageUrl = ensureCdnUrl(imagePath);

	// Update user's image field in database with CDN URL
	try {
		const [updated] = await traceAsync(
			"user.profile_picture.update_db",
			() =>
				db
					.update(auth.user)
					.set({
						image: imageUrl,
						updatedAt: new Date(),
					})
					.where(eq(auth.user.id, session.userId))
					.returning(),
			{
				description: "Updating user image in database",
				data: { userId: session.userId },
			}
		);

		if (!updated) {
			await recordWideError({
				name: "user.profile_picture.update_failed",
				error: new Error("User not found"),
				code: "USER_NOT_FOUND",
				message: "Failed to update user image - user not found",
				contextData: { userId: session.userId },
			});
			return c.json({ success: false, error: "User not found" }, 404);
		}

		return c.json({
			success: true,
			data: updated,
			image: imageUrl,
			originalName: file.name,
		});
	} catch (err) {
		await recordWideError({
			name: "user.profile_picture.update_failed",
			error: err,
			code: "USER_UPDATE_FAILED",
			message: "Failed to update user profile picture",
			contextData: { userId: session.userId },
		});
		return c.json({ success: false, error: "Failed to update profile picture" }, 500);
	}
});

apiRouteAdminUser.get("/export", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	if (!process.env.REDIS_URL) {
		return c.json(
			{
				success: false,
				message: "You can only request a data export once per day.",
			},
			429
		);
	}
	const redis = getRedis();
	const userId = session.userId;
	const key = `gdpr_export:${userId}`;

	// check if already requested within 24h
	const exists = await redis.get(key);
	if (exists) {
		return c.json(
			{
				success: false,
				message: "You can only request a data export once per day.",
			},
			429
		);
	}

	// set limiter key for 24 hours
	await redis.set(key, "1", "EX", 60 * 60 * 24);

	const traceContext = getTraceContext();

	await traceAsync("enqueue_gdpr_export", () =>
		enqueue("main", {
			type: "gdpr_export",
			traceContext,
			payload: {
				userId: userId,
			},
		})
	);

	return c.json({
		success: true,
		message:
			"Your data export has started. You will be notified when it is ready.",
	});
});

apiRouteAdminUser.delete("/delete", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const userId = session.userId;

	const [orgOwned] = await db
		.select({ id: schema.organization.id })
		.from(schema.organization)
		.where(eq(schema.organization.createdBy, userId))
		.limit(1);

	if (orgOwned) {
		return c.json(
			{
				success: false,
				error:
					"You cannot delete your account while you own organizations. Transfer ownership or delete your organizations first.",
			},
			400
		);
	}

	try {
		await traceAsync(
			"user.delete",
			async () => {
				await db
					.update(schema.taskTimeline)
					.set({ actorId: null })
					.where(eq(schema.taskTimeline.actorId, userId));
				await db
					.update(schema.taskComment)
					.set({ createdBy: null })
					.where(eq(schema.taskComment.createdBy, userId));
				await db
					.update(schema.taskCommentHistory)
					.set({ editedBy: null })
					.where(eq(schema.taskCommentHistory.editedBy, userId));
				await traceAsync(
					"user.delete.s3_files",
					async () => {
						try {
							await deleteFolder(`profile/${userId}/`);
							await deleteFolder(`files/${userId}/`);
						} catch (err) {
							console.error("Failed to delete user S3 files:", err);
						}
					},
					{ description: "Deleting user S3 files", data: { userId } }
				);

				await db.delete(auth.user).where(eq(auth.user.id, userId));
			},
			{
				description: "Deleting user account and cleaning up related data",
				data: { userId },
			}
		);

		return c.json({ success: true });
	} catch (err) {
		console.error(err);
		await recordWideError({
			name: "user.delete.failed",
			error: err,
			code: "USER_DELETE_FAILED",
			message: "Failed to delete user account",
			contextData: { userId },
		});
		return c.json({ success: false, error: "Failed to delete account" }, 500);
	}
});
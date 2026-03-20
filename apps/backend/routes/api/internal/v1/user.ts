import { auth, db, getUsersByIds, schema } from "@repo/database";
import { createTraceAsync, getTraceContext } from "@repo/opentelemetry/trace";
import { removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { enqueue, getRedis } from "@repo/queue";
import { auth as betterAuth } from "@repo/auth";

export const apiRouteAdminUser = new Hono<AppEnv>();

/**
 * Resolve user IDs to UserSummary objects.
 * Used by MentionView to render mention chips for any user by ID.
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
		const users = await traceAsync(
			"user.resolve",
			() => getUsersByIds(ids),
			{
				description: "Resolving user IDs to summaries",
				data: { count: ids.length },
			},
		);
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
	if (!process.env.REDIS_UR) {
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
				// Delete the user
				await db.delete(auth.user).where(eq(auth.user.id, userId));
			},
			{
				description: "Deleting user account and reassigning ownership",
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
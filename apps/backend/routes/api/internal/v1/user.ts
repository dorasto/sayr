import { auth, db } from "@repo/database";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";

export const apiRouteAdminUser = new Hono<AppEnv>();

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

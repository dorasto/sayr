import { auth } from "@repo/auth";
import { Hono } from "hono";
import type { AppEnv } from "@/index";

export const apiRouteConsole = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteConsole.post("/set-role", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	const session = c.get("session");

	await recordWideEvent({
		name: "setRole",
		description: "Set user role requested console endpoint",
		data: { route: "/set-role" },
	});

	if (!session?.userId) {
		await recordWideEvent({
			name: "setRole",
			description: "Authorization error: user not authenticated",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User not authenticated",
			},
		});
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const user = c.get("user");
	if (user?.role !== "admin") {
		await recordWideEvent({
			name: "setRole",
			description: "Authorization error: user lacked admin privileges",
			data: {
				type: "AuthorizationError",
				code: "Forbidden",
				message: "User does not have admin privileges",
				user_id: user?.id,
			},
		});
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}

	const { userId, role }: { userId: string; role: "admin" | "user" } =
		await c.req.json();

	// Basic sanity check
	if (!userId || !role) {
		await recordWideEvent({
			name: "setRole",
			description: "Validation error: User ID or role missing",
			data: {
				type: "ValidationError",
				code: "InvalidRequest",
				message: "User ID or role missing",
			},
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	try {
		const result = await auth.api.setRole({
			body: {
				userId: userId,
				role: role, // "admin" or "user"
			},
			// This endpoint requires session cookies.
			headers: c.req.raw.headers,
		});

		await recordWideEvent({
			name: "setRole",
			description: "User role updated successfully",
			data: {
				userId,
				newRole: role,
				adminId: session.userId,
			},
		});

		return c.json({ success: true, data: result?.user });
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		await recordWideEvent({
			name: "setRole",
			description: "Internal server error while setting user role",
			data: { error: (error as Error).message },
		});
		return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
	}
});

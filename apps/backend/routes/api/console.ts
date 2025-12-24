import { auth } from "@repo/auth";
import { Hono } from "hono";
import type { AppEnv } from "@/index";

export const apiRouteConsole = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteConsole.post("/set-role", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Set user role requested console endpoint";
	const session = c.get("session");
	if (!session?.userId) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User not authenticated",
		};
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const user = c.get("user");
	if (user?.role !== "admin") {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Forbidden",
			message: "User does not have admin privileges",
		};
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}
	const { userId, role }: { userId: string; role: "admin" | "user" } = await c.req.json();
	// Basic sanity check
	if (!userId || !role) {
		wideEvent.error = {
			type: "ValidationError",
			code: "InvalidRequest",
			message: "User ID or role missing",
		};
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
		wideEvent.userManagement = {
			updatedUserId: userId,
			newRole: role,
		};
		return c.json({ success: true, data: result?.user });
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
	}
});

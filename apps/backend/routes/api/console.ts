import { auth } from "@repo/auth";
import { Hono } from "hono";
import type { AppEnv } from "@/index";

export const apiRouteConsole = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteConsole.post("/set-role", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const user = c.get("user");
	if (user?.role !== "admin") {
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}
	const { userId, role }: { userId: string; role: "admin" | "user" } = await c.req.json();
	// Basic sanity check
	if (!userId || !role) {
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
		return c.json({ success: true, data: result?.user });
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
	}
});

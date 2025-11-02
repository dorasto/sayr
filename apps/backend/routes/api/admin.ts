import { getTasksByUserId } from "@repo/database";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";

export const apiRouteAdmin = new Hono<AppEnv>();

apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	try {
		const tasks = await getTasksByUserId(session.userId);
		return c.json({
			success: true,
			data: tasks,
		});
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
	}
});

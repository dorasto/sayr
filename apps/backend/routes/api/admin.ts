import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";

export const apiRouteAdmin = new Hono<AppEnv>();

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

apiRouteAdmin.post("/invite", async (c) => {
	const session = c.get("session");
	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const { invite, type }: { invite: schema.inviteType; type: "accept" | "deny" } = await c.req.json();
	// Basic sanity check
	if (!invite || !type) {
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}
	try {
		if (type === "accept") {
			await db
				.delete(schema.invite)
				.where(and(eq(schema.invite.id, invite.id), eq(schema.invite.organizationId, invite.organizationId)));
			await db.insert(schema.member).values({
				id: randomUUID(),
				userId: session.userId,
				organizationId: invite.organizationId,
				role: invite.role,
			});
			return c.json({
				success: true,
			});
		}
		if (type === "deny") {
			await db
				.delete(schema.invite)
				.where(and(eq(schema.invite.id, invite.id), eq(schema.invite.organizationId, invite.organizationId)));
			return c.json({
				success: true,
			});
		}
		// Catch any weird types (shouldn't happen if client validates)
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	} catch (err) {
		console.error("Invite Error:", err);
		return c.json({ success: false, error: "Internal error processing invite" }, 500);
	}
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

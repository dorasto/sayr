import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";

export const apiRouteAdmin = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Fetch users tasks requested";
	const session = c.get("session");
	if (!session?.userId) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User not authenticated",
		};
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	try {
		const tasks = await getTasksByUserId(session.userId);
		wideEvent.fetch = {
			success: true,
			taskCount: tasks.length,
			userId: session.userId,
		};
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
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Invite response submitted";
	if (!session?.userId) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User not authenticated",
		};
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const { invite, type }: { invite: schema.inviteType; type: "accept" | "deny" } = await c.req.json();
	// Basic sanity check
	if (!invite || !type) {
		wideEvent.error = {
			type: "ValidationError",
			code: "InvalidRequest",
			message: "Invite data or type missing",
		};
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}
	try {
		if (type === "accept") {
			//todo: fix the double db delete
			//todo: fix the role stuff with the new team roles
			await db
				.delete(schema.invite)
				.where(and(eq(schema.invite.id, invite.id), eq(schema.invite.organizationId, invite.organizationId)));
			await db.insert(schema.member).values({
				id: randomUUID(),
				userId: session.userId,
				organizationId: invite.organizationId,
				// role: invite.role,
			});
			wideEvent.invite = {
				accepted: true,
				organizationId: invite.organizationId,
			};
			return c.json({
				success: true,
			});
		}
		if (type === "deny") {
			await db
				.delete(schema.invite)
				.where(and(eq(schema.invite.id, invite.id), eq(schema.invite.organizationId, invite.organizationId)));
			wideEvent.invite = {
				accepted: false,
				organizationId: invite.organizationId,
			};
			return c.json({
				success: true,
			});
		}
		wideEvent.error = {
			type: "ValidationError",
			code: "UnknownInviteType",
			message: `Unknown invite response type: ${type}`,
		};
		// Catch any weird types (shouldn't happen if client validates)
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	} catch (err) {
		console.error("Invite Error:", err);
		return c.json({ success: false, error: "Internal error processing invite" }, 500);
	}
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

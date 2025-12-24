import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";

export const apiRouteAdmin = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	const session = c.get("session");

	if (!session?.userId) {
		await recordWideEvent({
			name: "getTasksMine",
			description: "User not authenticated for /tasks/mine",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User not authenticated",
			},
		});
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	try {
		const tasks = await getTasksByUserId(session.userId);
		await recordWideEvent({
			name: "getTasksMine",
			description: "Fetch user's assigned tasks",
			data: {
				success: true,
				taskCount: tasks.length,
				userId: session.userId,
			},
		});
		return c.json({
			success: true,
			data: tasks,
		});
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		await recordWideEvent({
			name: "getTasksMine",
			description: "Database error fetching user's tasks",
			data: { error: (error as Error).message },
		});
		return c.json({ success: false, error: "Failed to fetch tasks" }, 500);
	}
});

apiRouteAdmin.post("/invite", async (c) => {
	const recordWideEvent = c.get("recordWideEvent");
	const session = c.get("session");

	if (!session?.userId) {
		await recordWideEvent({
			name: "inviteResponse",
			description: "User not authenticated submitting invite response",
			data: {
				type: "AuthorizationError",
				code: "Unauthorized",
				message: "User not authenticated",
			},
		});
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const {
		invite,
		type,
	}: { invite: schema.inviteType; type: "accept" | "deny" } =
		await c.req.json();

	// Basic sanity check
	if (!invite || !type) {
		await recordWideEvent({
			name: "inviteResponse",
			description: "Invite data or type missing from request",
			data: {
				type: "ValidationError",
				code: "InvalidRequest",
				message: "Invite data or type missing",
			},
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	try {
		if (type === "accept") {
			//todo: fix the double db delete
			//todo: fix the role stuff with the new team roles
			await db
				.delete(schema.invite)
				.where(
					and(
						eq(schema.invite.id, invite.id),
						eq(schema.invite.organizationId, invite.organizationId),
					),
				);
			await db.insert(schema.member).values({
				id: randomUUID(),
				userId: session.userId,
				organizationId: invite.organizationId,
				// role: invite.role,
			});
			await recordWideEvent({
				name: "inviteResponse",
				description: "User accepted organization invite",
				data: {
					accepted: true,
					organizationId: invite.organizationId,
					userId: session.userId,
				},
			});
			return c.json({
				success: true,
			});
		}

		if (type === "deny") {
			await db
				.delete(schema.invite)
				.where(
					and(
						eq(schema.invite.id, invite.id),
						eq(schema.invite.organizationId, invite.organizationId),
					),
				);
			await recordWideEvent({
				name: "inviteResponse",
				description: "User denied organization invite",
				data: {
					accepted: false,
					organizationId: invite.organizationId,
					userId: session.userId,
				},
			});
			return c.json({
				success: true,
			});
		}

		await recordWideEvent({
			name: "inviteResponse",
			description: "Unknown invite response type received",
			data: {
				type: "ValidationError",
				code: "UnknownInviteType",
				message: `Unknown invite response type: ${type}`,
			},
		});

		// Catch any weird types (shouldn't happen if client validates)
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	} catch (err) {
		console.error("Invite Error:", err);
		await recordWideEvent({
			name: "inviteResponse",
			description: "Internal error processing invite response",
			data: {
				error: (err as Error).message,
				inviteId: invite?.id,
				type,
			},
		});
		return c.json(
			{ success: false, error: "Internal error processing invite" },
			500,
		);
	}
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";
import { createTraceAsync } from "@/tracing/wideEvent";

export const apiRouteAdmin = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const tasks = await traceAsync(
		"tasks.mine.fetch",
		() => getTasksByUserId(session.userId),
		{
			description: "Fetching user's assigned tasks",
			data: { userId: session.userId },
			onSuccess: (result) => ({
				description: "Tasks fetched successfully",
				data: { taskCount: result.length },
			}),
		},
	);

	await recordWideEvent({
		name: "tasks.mine.success",
		description: "Fetched user's assigned tasks",
		data: {
			taskCount: tasks.length,
			userId: session.userId,
		},
	});

	return c.json({ success: true, data: tasks });
});

apiRouteAdmin.post("/invite", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const recordWideEvent = c.get("recordWideEvent");

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const {
		invite,
		type,
	}: { invite: schema.inviteType; type: "accept" | "deny" } =
		await c.req.json();

	if (!invite || !type) {
		await recordWideError({
			name: "invite.response.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "Invite data or type missing",
			contextData: { userId: session.userId },
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	if (type !== "accept" && type !== "deny") {
		await recordWideError({
			name: "invite.response.invalid_type",
			error: new Error("Unknown invite type"),
			code: "UNKNOWN_INVITE_TYPE",
			message: `Unknown invite response type: ${type}`,
			contextData: { userId: session.userId, type },
		});
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	}

	// Delete the invite (common to both accept and deny)
	await traceAsync(
		"invite.response.delete_invite",
		() =>
			db
				.delete(schema.invite)
				.where(
					and(
						eq(schema.invite.id, invite.id),
						eq(schema.invite.organizationId, invite.organizationId),
					),
				),
		{
			description: "Deleting invite record",
			data: { inviteId: invite.id, organizationId: invite.organizationId },
		},
	);

	if (type === "accept") {
		// TODO: fix the double db delete
		// TODO: fix the role stuff with the new team roles
		await traceAsync(
			"invite.response.create_member",
			() =>
				db.insert(schema.member).values({
					id: randomUUID(),
					userId: session.userId,
					organizationId: invite.organizationId,
					// role: invite.role,
				}),
			{
				description: "Creating organization membership",
				data: { userId: session.userId, organizationId: invite.organizationId },
				onSuccess: () => ({
					description: "Membership created successfully",
					data: { organizationId: invite.organizationId },
				}),
			},
		);

		await recordWideEvent({
			name: "invite.response.accepted",
			description: "User accepted organization invite",
			data: {
				organizationId: invite.organizationId,
				userId: session.userId,
			},
		});

		return c.json({ success: true });
	}

	// type === "deny"
	await recordWideEvent({
		name: "invite.response.denied",
		description: "User denied organization invite",
		data: {
			organizationId: invite.organizationId,
			userId: session.userId,
		},
	});

	return c.json({ success: true });
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";
import { apiRouteAdminRelease } from "./release";
import { createTraceAsync } from "@repo/opentelemetry/trace";

export const apiRouteAdmin = new Hono<AppEnv>();

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const traceAsync = createTraceAsync();

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const tasks = await traceAsync("tasks.mine.fetch", () => getTasksByUserId(session.userId), {
		description: "Fetching user's assigned tasks",
		data: { userId: session.userId },
		onSuccess: (result) => ({
			description: "Tasks fetched successfully",
			data: { taskCount: result.length },
		}),
	});

	return c.json({ success: true, data: tasks });
});

apiRouteAdmin.post("/invite", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => null);
	const { invite, type }: {
		invite: schema.inviteType;
		type: "accept" | "deny";
	} = body ?? {};

	if (!invite || !type) {
		await recordWideError({
			name: "invite.response.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "Invite data or type missing",
			contextData: { user_id: session.userId },
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	if (type !== "accept" && type !== "deny") {
		await recordWideError({
			name: "invite.response.invalid_type",
			error: new Error("Unknown invite type"),
			code: "UNKNOWN_INVITE_TYPE",
			message: `Unknown invite response type: ${type}`,
			contextData: { user_id: session.userId, type },
		});
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	}

	// ✅ Delete invite (shared path)
	await traceAsync(
		"invite.response.delete",
		() =>
			db
				.delete(schema.invite)
				.where(
					and(
						eq(schema.invite.id, invite.id),
						eq(schema.invite.organizationId, invite.organizationId)
					)
				),
		{
			description: "Deleting invite record",
			data: {
				invite_id: invite.id,
				user: { id: session.userId },
				organization: { id: invite.organizationId },
				action: type,
			},
		}
	);

	if (type === "accept") {
		await traceAsync(
			"invite.response.create_member",
			() =>
				db.insert(schema.member).values({
					id: randomUUID(),
					userId: session.userId,
					organizationId: invite.organizationId,
				}),
			{
				description: "Creating organization membership",
				data: {
					user: { id: session.userId },
					organization: { id: invite.organizationId },
				},
				onSuccess: () => ({
					outcome: "Membership created",
				}),
			}
		);

		// ✅ Trace acceptance event
		await traceAsync(
			"invite.response.accepted",
			async () => { },
			{
				description: "User accepted organization invite",
				data: {
					user: { id: session.userId },
					organization: { id: invite.organizationId },
				},
			}
		);

		return c.json({ success: true });
	}

	// ✅ type === "deny"
	await traceAsync(
		"invite.response.denied",
		async () => { },
		{
			description: "User denied organization invite",
			data: {
				user: { id: session.userId },
				organization: { id: invite.organizationId },
			},
		}
	);

	return c.json({ success: true });
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

// Release routes
apiRouteAdmin.route("/release", apiRouteAdminRelease);

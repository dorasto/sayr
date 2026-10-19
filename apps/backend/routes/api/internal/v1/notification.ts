import {
	NotificationHelper,
	db,
	schema,
	userSummaryColumns
} from "@repo/database";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import type { WSBaseMessage } from "@/routes/ws/types";
import { sseBroadcastByUserId } from "@/routes/events";
import { eq, inArray, sql } from "drizzle-orm";
import { ensureCdnUrl } from "@repo/util";

export const apiRouteAdminNotification = new Hono<AppEnv>();

// Get notifications for the current user
apiRouteAdminNotification.get("/", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const limit = Math.min(Number.parseInt(c.req.query("limit") || "50", 10) || 50, 100);
	const page = Math.max(Number.parseInt(c.req.query("page") || "0") || 0, 1);
	// const unreadOnly = c.req.query("unread") === "true";
	// const organizationId = c.req.query("org_id") || undefined;

	const notificationsData = await traceAsync(
		"notifications.list",
		async () => {
			const memberships = await db.query.member.findMany({
				where: (member) => eq(member.userId, session.userId),
				with: {
					organization: {
						columns: {
							id: true,
							plan: true,
						},
					},
				},
			});
			const allowedOrgIds = new Set(
				memberships
					.filter((m) => {
						if (m.organization.plan !== "pro") return true;
						return m.seatAssigned === true;
					})
					.map((m) => m.organizationId)
			);
			// if (organizationId && !allowedOrgIds.has(organizationId)) {
			// 	return {
			// 		notifications: [],
			// 		unreadCount: 0,
			// 		paginated: {
			// 			page: page,
			// 			limit: limit,
			// 			totalPages: 1,
			// 			totalItems: 1,
			// 			hasMore: page < 1,
			// 		},
			// 	};
			// }
			const conditions = [
				eq(schema.notifications.recipientId, session.userId),
				inArray(schema.notifications.resourceId, Array.from(allowedOrgIds)),
			];

			// if (options?.unreadOnly) {
			// 	conditions.push(isNull(notifications.readAt));
			// }

			// if (options?.organizationId) {
			// 	conditions.push(eq(notifications.resourceId, options.organizationId));
			// }
			const results = await NotificationHelper.listNotifications({
				conditions,
				columns: {
					id: true,
					type: true,
					data: true,
					delivered: true,
					readAt: true,
					createdAt: true,
					updatedAt: true,
				},
				with: {
					actor: {
						columns: userSummaryColumns,
					},
					recipient: {
						columns: userSummaryColumns,
					},
					resourceId: {
						columns: {
							id: true,
							name: true,
							slug: true,
							logo: true,
							shortId: true,
						},
					},
				},
				limit,
				page
			})
			const notificationsData = results.notifications.map(({ resourceId, ...notification }: { resourceId: any }) => ({
				...notification,
				organization: resourceId ? {
					...resourceId,
					logo: resourceId.logo ? ensureCdnUrl(resourceId.logo) : null
				} : undefined
			})) as any
			return {
				notifications: notificationsData,
				unreadCount: results.unreadCount,
				paginated: results.paginated,
			}
		},
		{
			description: "Fetching user notifications",
			data: { userId: session.userId, limit, page },
		},
	);

	return c.json({ success: true, data: notificationsData.notifications, unreadCount: notificationsData.unreadCount, paginated: notificationsData.paginated });
});

// Mark a single notification as read
apiRouteAdminNotification.patch("/:id/read", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const notificationId = c.req.param("id");

	const updated = await traceAsync(
		"notifications.mark_read",
		() => NotificationHelper.markRead({ id: notificationId, recipientId: session.userId }),
		{
			description: "Marking notification as read",
			data: { notificationId, userId: session.userId },
		},
	);

	if (!updated) {
		return c.json({ success: false, error: "Notification not found" }, 404);
	}

	// Broadcast to user's other tabs/sessions
	sseBroadcastByUserId(session.userId, "", "", {
		type: "NOTIFICATION_READ" as WSBaseMessage["type"],
		data: { id: notificationId },
		meta: { ts: Date.now() },
	});

	return c.json({ success: true, data: updated });
});

// Mark all notifications as read
apiRouteAdminNotification.patch("/read-all", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => ({}));
	const organizationId = body?.org_id;

	await traceAsync(
		"notifications.mark_all_read",
		() => NotificationHelper.markAllRead({ recipientId: session.userId }),
		{
			description: "Marking all notifications as read",
			data: { userId: session.userId, organizationId },
		},
	);

	// Broadcast to user's other tabs/sessions
	sseBroadcastByUserId(session.userId, "", "", {
		type: "NOTIFICATION_READ" as WSBaseMessage["type"],
		data: { all: true, organizationId },
		meta: { ts: Date.now() },
	});

	return c.json({ success: true });
});

// Mark all notifications for a specific task as read
apiRouteAdminNotification.get("/read-by-task/:taskId", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const taskId = c.req.param("taskId");

	const markedCount = await traceAsync(
		"notifications.mark_read_by_task",
		async () => {
			const conditions = [
				sql`${schema.notifications.data}->>'taskId' = ${taskId}`,
			];
			return await NotificationHelper.markReadByData({ recipientId: session.userId, conditions })

		},
		{
			description: "Marking notifications read by task",
			data: { userId: session.userId, taskId },
		},
	);

	sseBroadcastByUserId(session.userId, "", "", {
		type: "NOTIFICATION_READ" as WSBaseMessage["type"],
		data: {},
		meta: { ts: Date.now() },
	});

	return c.json({ success: true, data: { markedCount } });
});
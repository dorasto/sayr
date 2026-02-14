import {
	archiveNotification,
	deleteNotification,
	getNotificationsForUser,
	getUnreadNotificationCount,
	markAllNotificationsRead,
	markNotificationRead,
	markNotificationUnread,
} from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { broadcastByUserId } from "../../../ws";
import type { WSBaseMessage } from "@/routes/ws/types";

export const apiRouteAdminNotification = new Hono<AppEnv>();

// Get notifications for the current user
apiRouteAdminNotification.get("/", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const limit = Math.min(Number.parseInt(c.req.query("limit") || "50", 10) || 50, 100);
	const offset = Math.max(Number.parseInt(c.req.query("offset") || "0", 10) || 0, 0);
	const unreadOnly = c.req.query("unread") === "true";
	const organizationId = c.req.query("org_id") || undefined;

	const notifications = await traceAsync(
		"notifications.list",
		() => getNotificationsForUser(session.userId, { limit, offset, unreadOnly, organizationId }),
		{
			description: "Fetching user notifications",
			data: { userId: session.userId, limit, offset, unreadOnly },
		},
	);

	// Transform organization logos to use CDN URLs
	const transformedNotifications = notifications.map((n) => ({
		...n,
		organization: n.organization
			? {
					...n.organization,
					logo: n.organization.logo ? ensureCdnUrl(n.organization.logo) : null,
				}
			: undefined,
	}));

	return c.json({ success: true, data: transformedNotifications });
});

// Get unread notification count
apiRouteAdminNotification.get("/unread-count", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const organizationId = c.req.query("org_id") || undefined;

	const count = await traceAsync(
		"notifications.unread_count",
		() => getUnreadNotificationCount(session.userId, organizationId),
		{
			description: "Fetching unread notification count",
			data: { userId: session.userId },
		},
	);

	return c.json({ success: true, data: { count } });
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
		() => markNotificationRead(notificationId, session.userId),
		{
			description: "Marking notification as read",
			data: { notificationId, userId: session.userId },
		},
	);

	if (!updated) {
		return c.json({ success: false, error: "Notification not found" }, 404);
	}

	// Broadcast to user's other tabs/sessions
	broadcastByUserId(session.userId, "", "", {
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
		() => markAllNotificationsRead(session.userId, organizationId),
		{
			description: "Marking all notifications as read",
			data: { userId: session.userId, organizationId },
		},
	);

	// Broadcast to user's other tabs/sessions
	broadcastByUserId(session.userId, "", "", {
		type: "NOTIFICATION_READ" as WSBaseMessage["type"],
		data: { all: true, organizationId },
		meta: { ts: Date.now() },
	});

	return c.json({ success: true });
});

// Archive a notification
apiRouteAdminNotification.patch("/:id/archive", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const notificationId = c.req.param("id");

	const updated = await traceAsync(
		"notifications.archive",
		() => archiveNotification(notificationId, session.userId),
		{
			description: "Archiving notification",
			data: { notificationId, userId: session.userId },
		},
	);

	if (!updated) {
		return c.json({ success: false, error: "Notification not found" }, 404);
	}

	return c.json({ success: true, data: updated });
});

// Mark a single notification as unread
apiRouteAdminNotification.patch("/:id/unread", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const notificationId = c.req.param("id");

	const updated = await traceAsync(
		"notifications.mark_unread",
		() => markNotificationUnread(notificationId, session.userId),
		{
			description: "Marking notification as unread",
			data: { notificationId, userId: session.userId },
		},
	);

	if (!updated) {
		return c.json({ success: false, error: "Notification not found" }, 404);
	}

	// Broadcast to user's other tabs/sessions
	broadcastByUserId(session.userId, "", "", {
		type: "NOTIFICATION_UNREAD" as WSBaseMessage["type"],
		data: { id: notificationId },
		meta: { ts: Date.now() },
	});

	return c.json({ success: true, data: updated });
});

// Delete a notification permanently
apiRouteAdminNotification.delete("/:id", async (c) => {
	const traceAsync = createTraceAsync();
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const notificationId = c.req.param("id");

	const deleted = await traceAsync(
		"notifications.delete",
		() => deleteNotification(notificationId, session.userId),
		{
			description: "Deleting notification",
			data: { notificationId, userId: session.userId },
		},
	);

	if (!deleted) {
		return c.json({ success: false, error: "Notification not found" }, 404);
	}

	return c.json({ success: true, data: deleted });
});

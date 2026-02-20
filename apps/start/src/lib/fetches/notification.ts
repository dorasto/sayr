import type { schema } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/**
 * Fetches notifications for the current user.
 */
export async function getNotifications(options?: {
	limit?: number;
	offset?: number;
	unreadOnly?: boolean;
	orgId?: string;
}): Promise<{ success: boolean; data: schema.NotificationWithDetails[]; error?: string }> {
	const params = new URLSearchParams();
	if (options?.limit) params.set("limit", String(options.limit));
	if (options?.offset) params.set("offset", String(options.offset));
	if (options?.unreadOnly) params.set("unread", "true");
	if (options?.orgId) params.set("org_id", options.orgId);

	const qs = params.toString();
	const url = `${API_URL}/v1/admin/notification${qs ? `?${qs}` : ""}`;

	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	return res.json();
}

/**
 * Fetches the unread notification count for the current user.
 */
export async function getUnreadNotificationCount(orgId?: string): Promise<{
	success: boolean;
	data: { count: number };
	error?: string;
}> {
	const params = new URLSearchParams();
	if (orgId) params.set("org_id", orgId);

	const qs = params.toString();
	const url = `${API_URL}/v1/admin/notification/unread-count${qs ? `?${qs}` : ""}`;

	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	return res.json();
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationReadAction(notificationId: string): Promise<{
	success: boolean;
	data?: schema.notificationType;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/${notificationId}/read`, {
		method: "PATCH",
		credentials: "include",
	});

	return res.json();
}

/**
 * Marks all notifications as read, optionally scoped to an organization.
 */
export async function markAllNotificationsReadAction(orgId?: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/read-all`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify(orgId ? { org_id: orgId } : {}),
	});

	return res.json();
}

/**
 * Archives (soft-deletes) a notification.
 */
export async function archiveNotificationAction(notificationId: string): Promise<{
	success: boolean;
	data?: schema.notificationType;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/${notificationId}/archive`, {
		method: "PATCH",
		credentials: "include",
	});

	return res.json();
}

/**
 * Marks a single notification as unread.
 */
export async function markNotificationUnreadAction(notificationId: string): Promise<{
	success: boolean;
	data?: schema.notificationType;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/${notificationId}/unread`, {
		method: "PATCH",
		credentials: "include",
	});

	return res.json();
}

/**
 * Permanently deletes a notification.
 */
export async function deleteNotificationAction(notificationId: string): Promise<{
	success: boolean;
	data?: schema.notificationType;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/${notificationId}`, {
		method: "DELETE",
		credentials: "include",
	});

	return res.json();
}

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

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
 * Marks all unread notifications for a specific task as read.
 * Used when a user views a task directly (outside the inbox).
 */
export async function markNotificationsReadByTaskAction(taskId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	const res = await fetch(`${API_URL}/v1/admin/notification/read-by-task/${taskId}`, {
		method: "PATCH",
		credentials: "include",
	});

	return res.json();
}

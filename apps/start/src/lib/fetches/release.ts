import type { schema } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";
const BASE = `${API_URL}/v1/admin/release`;

/**
 * Creates a new release in the organization
 */
export async function createReleaseAction(
	orgId: string,
	data: {
		name: string;
		slug: string;
		description?: schema.NodeJSON;
		status?: "planned" | "in-progress" | "released" | "archived";
		targetDate?: Date;
		color?: string;
		icon?: string;
	},
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseType; error?: string }> {
	console.info("Creating release", { orgId, name: data.name });
	const result = await fetch(`${API_URL}/v1/admin/release/create`, {
		method: "POST",
		body: JSON.stringify({
			org_id: orgId,
			sseClientId,
			name: data.name,
			slug: data.slug,
			description: data.description,
			status: data.status,
			targetDate: data.targetDate,
			color: data.color,
			icon: data.icon,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to create release", {
			error: result.error,
			orgId,
		});
	}
	return result;
}

/**
 * Updates an existing release
 */
export async function updateReleaseAction(
	orgId: string,
	releaseId: string,
	data: {
		name?: string;
		slug?: string;
		description?: schema.NodeJSON;
		status?: "planned" | "in-progress" | "released" | "archived";
		targetDate?: Date | null;
		releasedAt?: Date | null;
		color?: string;
		icon?: string;
		leadId?: string | null;
	},
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseType; error?: string }> {
	console.info("Updating release", { orgId, releaseId });

	const payload = {
		org_id: orgId,
		sseClientId,
		release_id: releaseId,
		...(data.name !== undefined ? { name: data.name } : {}),
		...(data.slug !== undefined ? { slug: data.slug } : {}),
		...(data.description !== undefined ? { description: data.description } : {}),
		...(data.status !== undefined ? { status: data.status } : {}),
		...(data.targetDate !== undefined ? { targetDate: data.targetDate } : {}),
		...(data.releasedAt !== undefined ? { releasedAt: data.releasedAt } : {}),
		...(data.color !== undefined ? { color: data.color } : {}),
		...(data.icon !== undefined ? { icon: data.icon } : {}),
		...(data.leadId !== undefined ? { leadId: data.leadId } : {}),
	};

	const result = await fetch(`${API_URL}/v1/admin/release/update`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to update release", {
			error: result.error,
			orgId,
			releaseId,
		});
	}
	return result;
}

/**
 * Deletes a release (sets all associated tasks' releaseId to null)
 */
export async function deleteReleaseAction(
	orgId: string,
	releaseId: string,
	sseClientId: string
): Promise<{ success: boolean; error?: string }> {
	console.info("Deleting release", { orgId, releaseId });

	const result = await fetch(`${API_URL}/v1/admin/release/delete`, {
		method: "DELETE",
		body: JSON.stringify({
			org_id: orgId,
			sseClientId,
			release_id: releaseId,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to delete release", {
			error: result.error,
			orgId,
			releaseId,
		});
	}
	return result;
}

/**
 * Marks a release as released and auto-closes all incomplete tasks
 * This should be called after user confirmation
 */
export async function markReleaseAsReleasedAction(
	orgId: string,
	releaseId: string,
	sseClientId: string
): Promise<{ success: boolean; data: { release: schema.releaseType; updatedTaskCount: number }; error?: string }> {
	console.info("Marking release as released", { orgId, releaseId });

	const result = await fetch(`${API_URL}/v1/admin/release/mark-released`, {
		method: "POST",
		body: JSON.stringify({
			org_id: orgId,
			sseClientId,
			release_id: releaseId,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to mark release as released", {
			error: result.error,
			orgId,
			releaseId,
		});
	}
	return result;
}

/**
 * Fetches a single release with all its tasks
 */
export async function getReleaseWithTasksAction(
	orgId: string,
	releaseId: string
): Promise<{ success: boolean; data: schema.ReleaseWithTasks; error?: string }> {
	console.info("Fetching release with tasks", { orgId, releaseId });

	const result = await fetch(`${API_URL}/v1/admin/release/${releaseId}?org_id=${orgId}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());

	if (!result.success) {
		console.error("Failed to fetch release", {
			error: result.error,
			orgId,
			releaseId,
		});
	}
	return result;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function addReleaseLabelAction(
	orgId: string,
	releaseId: string,
	labelId: string,
	sseClientId: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/labels`, {
		method: "POST",
		body: JSON.stringify({ org_id: orgId, sseClientId, labelId }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function removeReleaseLabelAction(
	orgId: string,
	releaseId: string,
	labelId: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/labels/${labelId}?org_id=${orgId}`, {
		method: "DELETE",
		credentials: "include",
	}).then((r) => r.json());
}

// ─── Status Updates ───────────────────────────────────────────────────────────

export async function getReleaseStatusUpdatesAction(
	orgId: string,
	releaseId: string
): Promise<{ success: boolean; data: schema.ReleaseStatusUpdateWithAuthor[]; error?: string }> {
	return fetch(`${BASE}/${releaseId}/status-updates?org_id=${orgId}`, {
		credentials: "include",
	}).then((r) => r.json());
}

export async function createReleaseStatusUpdateAction(
	orgId: string,
	releaseId: string,
	data: {
		content?: schema.NodeJSON;
		health: "on_track" | "at_risk" | "off_track";
		visibility: "public" | "internal";
	},
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseStatusUpdateType; error?: string }> {
	return fetch(`${BASE}/${releaseId}/status-updates`, {
		method: "POST",
		body: JSON.stringify({ org_id: orgId, sseClientId, ...data }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function updateReleaseStatusUpdateAction(
	orgId: string,
	releaseId: string,
	updateId: string,
	data: Partial<{ content: schema.NodeJSON; health: "on_track" | "at_risk" | "off_track"; visibility: "public" | "internal" }>,
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseStatusUpdateType; error?: string }> {
	return fetch(`${BASE}/${releaseId}/status-updates/${updateId}`, {
		method: "PATCH",
		body: JSON.stringify({ org_id: orgId, sseClientId, ...data }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function deleteReleaseStatusUpdateAction(
	orgId: string,
	releaseId: string,
	updateId: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/status-updates/${updateId}?org_id=${orgId}`, {
		method: "DELETE",
		credentials: "include",
	}).then((r) => r.json());
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getReleaseCommentsAction(
	orgId: string,
	releaseId: string,
	statusUpdateId?: string | null,
	pagination?: { limit?: number; page?: number; direction?: "asc" | "desc" }
): Promise<{
	success: boolean;
	data: schema.ReleaseCommentWithAuthor[];
	pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
	error?: string;
}> {
	const qs = statusUpdateId !== undefined ? `&statusUpdateId=${statusUpdateId ?? "null"}` : "";
	const paginationQs = pagination
		? [
				pagination.limit !== undefined ? `&limit=${pagination.limit}` : "",
				pagination.page !== undefined ? `&page=${pagination.page}` : "",
				pagination.direction ? `&direction=${pagination.direction}` : "",
			].join("")
		: "";
	return fetch(`${BASE}/${releaseId}/comments?org_id=${orgId}${qs}${paginationQs}`, {
		credentials: "include",
	}).then((r) => r.json());
}

export async function getReleaseCommentRepliesAction(
	orgId: string,
	releaseId: string,
	commentId: string
): Promise<{ success: boolean; data: schema.ReleaseCommentWithAuthor[]; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments/${commentId}/replies?org_id=${orgId}`, {
		credentials: "include",
	}).then((r) => r.json());
}

export async function createReleaseCommentAction(
	orgId: string,
	releaseId: string,
	data: {
		content: schema.NodeJSON;
		visibility: "public" | "internal";
		statusUpdateId?: string;
		parentId?: string;
	},
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseCommentType; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments`, {
		method: "POST",
		body: JSON.stringify({ org_id: orgId, sseClientId, ...data }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function updateReleaseCommentAction(
	orgId: string,
	releaseId: string,
	commentId: string,
	data: Partial<{ content: schema.NodeJSON; visibility: "public" | "internal" }>,
	sseClientId: string
): Promise<{ success: boolean; data: schema.releaseCommentType; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments/${commentId}`, {
		method: "PATCH",
		body: JSON.stringify({ org_id: orgId, sseClientId, ...data }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function deleteReleaseCommentAction(
	orgId: string,
	releaseId: string,
	commentId: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments/${commentId}?org_id=${orgId}`, {
		method: "DELETE",
		credentials: "include",
	}).then((r) => r.json());
}

export async function addReleaseCommentReactionAction(
	orgId: string,
	releaseId: string,
	commentId: string,
	emoji: string,
	sseClientId: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments/${commentId}/reactions`, {
		method: "POST",
		body: JSON.stringify({ org_id: orgId, sseClientId, emoji }),
		headers: { "Content-Type": "application/json" },
		credentials: "include",
	}).then((r) => r.json());
}

export async function removeReleaseCommentReactionAction(
	releaseId: string,
	commentId: string,
	emoji: string
): Promise<{ success: boolean; error?: string }> {
	return fetch(`${BASE}/${releaseId}/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`, {
		method: "DELETE",
		credentials: "include",
	}).then((r) => r.json());
}

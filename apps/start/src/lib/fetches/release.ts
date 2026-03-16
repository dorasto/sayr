import type { schema } from "@repo/database";

const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

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

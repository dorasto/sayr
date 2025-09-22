"use client";

import type { PartialBlock } from "@blocknote/core";

export interface UpdateOrganizationData {
	name: string;
	slug: string;
	logo?: string;
	bannerImg?: string;
	description?: string;
}
/**
 * Updates an organization's details by calling the external admin API.
 *
 * This action:
 * - Sends a POST request with the updated organization data.
 * - Includes the client WebSocket ID (`wsClientId`) to support broadcast updates
 *   (ensuring events are sent to everyone except the caller).
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The organization fields to update (name, slug, logo, banner image, description).
 * @param wsClientId - A WebSocket client ID, used to broadcast changes to everyone except you.
 * @returns A promise resolving to the JSON response returned by the external API.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationAction("org_123", {
 *   name: "New Org Name",
 *   slug: "new-org-slug",
 *   description: "Updated description",
 * }, "client_456");
 *
 * console.log(result.success ? "Organization updated!" : "Update failed");
 * ```
 */
export async function updateOrganizationAction(
	organizationId: string,
	data: UpdateOrganizationData,
	wsClientId: string
) {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/update-org`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			data: data,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result;
}

/**
 * Uploads an organization's logo to the external API
 *
 * @param organizationId - The ID of the org to upload logo for
 * @param file - A File object (image) to upload
 * @returns A promise resolving to { success, image, orgId, originalName }
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationLogo("org_123", fileInput.files[0]);
 *   console.log("Logo URL:", result.image);
 * }
 * ```
 */
export async function uploadOrganizationLogo(organizationId: string, file: File, old: string | undefined | null) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/orgs/${organizationId}/logo`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
		headers: {
			"X-old-file": old || "",
		},
	});

	if (!res.ok) {
		throw new Error("Logo upload failed");
	}

	return res.json() as Promise<{
		success: boolean;
		image: string; // CDN/Storage URL to the new logo
		orgId: string; // orgId echoed back
		originalName: string; // original filename
	}>;
}

/**
 * Uploads an organization's banner to the external API
 *
 * @param organizationId - The ID of the org to upload banner for
 * @param file - A File object (image) to upload
 * @returns A promise resolving to { success, image, orgId, originalName }
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationBanner("org_123", fileInput.files[0]);
 *   console.log("Logo URL:", result.image);
 * }
 * ```
 */
export async function uploadOrganizationBanner(organizationId: string, file: File, old: string | undefined | null) {
	const formData = new FormData();
	formData.append("file", file);

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/orgs/${organizationId}/banner`, {
		method: "PUT",
		body: formData,
		credentials: "include", // ensure cookies/session
		headers: {
			"X-old-file": old || "",
		},
	});

	if (!res.ok) {
		throw new Error("Banner upload failed");
	}

	return res.json() as Promise<{
		success: boolean;
		image: string; // CDN/Storage URL to the new banner
		orgId: string; // orgId echoed back
		originalName: string; // original filename
	}>;
}

/**
 * Updates an organization's details by calling the external admin API.
 *
 * This action:
 * - Sends a POST request with the updated organization data.
 * - Includes the client WebSocket ID (`wsClientId`) to support broadcast updates
 *   (ensuring events are sent to everyone except the caller).
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The organization fields to update (name).
 * @param wsClientId - A WebSocket client ID, used to broadcast changes to everyone except you.
 * @returns A promise resolving to the JSON response returned by the external API.
 *
 * @example
 * ```ts
 * const result = await createProjectAction("org_123", {
 *   name: "New Org Name",
 *   slug: "new-org-slug",
 *   description: "Updated description",
 * }, "client_456");
 *
 * console.log(result.success ? "Organization updated!" : "Update failed");
 * ```
 */
export async function createProjectAction(
	organizationId: string,
	data: {
		name: string;
		description: string;
	},
	wsClientId: string
) {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/project/create`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			name: data.name,
			description: data.description,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result;
}

/**
 * Calls the `/admin/project/task/create` API to update an existing task.
 * Only the fields provided in `data` will be updated.
 *
 * @param organizationId - The ID of the task's organization.
 * @param projectId - The ID of the project the task belongs to.
 * @param data - Partial task fields to update.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns The updated task (with labels, assignees, timeline, etc.)
 */
export async function createTaskAction(
	organizationId: string,
	projectId: string,
	data: {
		title: string;
		description: PartialBlock[] | undefined;
		status: string | undefined | null;
		priority: string | undefined | null;
		labels: string[];
	},
	wsClientId: string
) {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/project/task/create`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			project_id: projectId,
			title: data.title,
			description: data.description,
			status: data.status,
			priority: data.priority,
			labels: data.labels,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result;
}

/**
 * Calls the `/admin/project/task/update` API to update an existing task.
 * Only the fields provided in `data` will be updated.
 *
 * @param organizationId - The ID of the task's organization.
 * @param projectId - The ID of the project the task belongs to.
 * @param taskId - The ID of the task to update.
 * @param data - Partial task fields to update.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns The updated task (with labels, assignees, timeline, etc.)
 */
export async function updateTaskAction(
	organizationId: string,
	projectId: string,
	taskId: string,
	data: {
		title?: string;
		description?: PartialBlock[];
		status?: string | null;
		priority?: string | null;
		labels?: string[];
		assignees?: string[];
	},
	wsClientId: string
) {
	const payload = {
		org_id: organizationId,
		wsClientId,
		project_id: projectId,
		task_id: taskId,
		// Merge only the fields passed in
		...(data.title !== undefined ? { title: data.title } : {}),
		...(data.description !== undefined ? { description: data.description } : {}),
		...(data.status !== undefined ? { status: data.status } : {}),
		...(data.priority !== undefined ? { priority: data.priority } : {}),
		...(data.labels !== undefined ? { labels: data.labels } : {}),
		...(data.assignees !== undefined ? { assignees: data.assignees } : {}),
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/project/task/update`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result;
}

/**
 * Calls the `/admin/label/create` API to create a new label in an organization.
 *
 * @param organizationId - The ID of the organization the label belongs to.
 * @param data - The label properties (name and color).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns The newly created label record.
 *
 * @example
 * ```ts
 * const label = await createLabelAction("org_123", {
 *   name: "Bug",
 *   color: "#ff0000",
 * });
 * if (label.success) {
 *   console.log("Created label:", label.data);
 * }
 * ```
 */
export async function createLabelAction(
	organizationId: string,
	data: {
		name: string;
		color: string;
	},
	wsClientId: string
) {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/create-label`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create label");
		}
		return json;
	});

	return result;
}

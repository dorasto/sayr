"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";

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
): Promise<{ success: boolean; data: schema.organizationType; error?: string }> {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/update`, {
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

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/${organizationId}/logo`, {
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

	const res = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/${organizationId}/banner`, {
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
 * Calls the `/admin/task/create` API to create a new task
 * within a given project inside an organization.
 *
 * @param organizationId - The ID of the organization where the task will be created.
 * @param data - The properties of the new task:
 * - `title` (required) - The task title.
 * - `description` (optional) - The task description (array of editor blocks).
 * - `status` (optional) - The status ID of the task, or `null` if not set.
 * - `priority` (optional) - The priority ID of the task, or `null` if not set.
 * - `labels` (optional) - Array of label IDs to assign to the task.
 * @param wsClientId - The WebSocket client ID (used for pushing live updates).
 * @returns A promise resolving to:
 * - `success` — Indicates whether the creation succeeded.
 * - `data` — The newly created task record (with labels, assignees, timelines, etc).
 * - `error` — An optional error message if creation failed.
 *
 * @example
 * ```ts
 * const result = await createTaskAction(
 *   "org_123",
 *   {
 *     title: "Implement new feature",
 *     description: [{ type: "paragraph", content: "Build the dashboard UI" }],
 *     status: "todo",
 *     priority: "medium",
 *     labels: ["label_bug", "label_priority"],
 *   },
 *   "ws_client_001"
 * );
 *
 * if (result.success) {
 *   console.log("Task created:", result.data);
 * } else {
 *   console.error("Failed to create:", result.error);
 * }
 * ```
 */
export async function createTaskAction(
	organizationId: string,
	data: {
		title: string;
		description: PartialBlock[] | undefined;
		status: string | undefined | null;
		priority: string | undefined | null;
		labels: string[];
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.TaskWithLabels; error?: string }> {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/create`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
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
 * Calls the `/admin/organization/task/update` API to update an existing task.
 * Only the fields provided in `data` will be updated.
 *
 * @param organizationId - The ID of the organization the task belongs to.
 * @param taskId - The ID of the task to update.
 * @param data - The fields to update on the task:
 * - `title` (optional) - The new task title.
 * - `description` (optional) - The updated description (array of editor blocks).
 * - `status` (optional) - The new status ID, or `null` to remove.
 * - `priority` (optional) - The new priority ID, or `null` to remove.
 * - `category` (optional) - The new category ID, or `null` to remove.
 *
 * @param wsClientId - The WebSocket client ID (for pushing real-time updates).
 * @returns A promise resolving to:
 * - `success` — Indicates whether the update succeeded.
 * - `data` — The updated task record (with labels, assignees, timelines, etc).
 * - `error` — An optional error message if the update failed.
 *
 * @example
 * ```ts
 * const result = await updateTaskAction(
 *   "org_123",
 *   "task_789",
 *   { status: "done", priority: "high" },
 *   "ws_client_001"
 * );
 *
 * if (result.success) {
 *   console.log("Task updated:", result.data);
 * } else {
 *   console.error("Failed to update task:", result.error);
 * }
 * ```
 */
export async function updateTaskAction(
	organizationId: string,
	taskId: string,
	data: {
		title?: string;
		description?: PartialBlock[];
		status?: string | null;
		priority?: string | null;
		category?: string | null;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.TaskWithLabels; error?: string }> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		// Merge only the fields passed in
		...(data.title !== undefined ? { title: data.title } : {}),
		...(data.description !== undefined ? { description: data.description } : {}),
		...(data.status !== undefined ? { status: data.status } : {}),
		...(data.category !== undefined ? { category: data.category } : {}),
		...(data.priority !== undefined ? { priority: data.priority } : {}),
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update`, {
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
 * Calls the `/admin/task/update-labels` API to update the labels of an existing task.
 * This replaces any existing labels on the task with the provided `labels` array.
 *
 * @param organizationId - The ID of the organization the task belongs to.
 * @param taskId - The ID of the task being updated.
 * @param labels - Array of label IDs to assign to the task (replaces current labels).
 * @param wsClientId - The WebSocket client ID (used for pushing live updates).
 * @returns A promise resolving to an object containing:
 * - `success`: Whether the update was successful.
 * - `data`: The updated task record (with labels, assignees, timeline, etc.) on success.
 * - `error`: An optional error message if the update failed.
 *
 * @example
 * ```ts
 * const result = await updateLabelToTaskAction(
 *   "org_123",
 *   "task_789",
 *   ["label_bug", "label_priority"],
 *   "ws_client_001"
 * );
 *
 * if (result.success) {
 *   console.log("Updated task:", result.data);
 * } else {
 *   console.error("Failed to update labels:", result.error);
 * }
 * ```
 */
export async function updateLabelToTaskAction(
	organizationId: string,
	taskId: string,
	labels: string[],
	wsClientId: string
): Promise<{ success: boolean; data: schema.TaskWithLabels; skipped: boolean; error?: string }> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		labels: labels,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update-labels`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result as { success: boolean; data: schema.TaskWithLabels; skipped: boolean; error?: string };
}

export async function updateAssigneesToTaskAction(
	organizationId: string,
	taskId: string,
	assignees: string[],
	wsClientId: string
): Promise<{ success: boolean; data: schema.TaskWithLabels; skipped: boolean; error?: string }> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		assignees: assignees,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/update-assignees`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result as { success: boolean; data: schema.TaskWithLabels; skipped: boolean; error?: string };
}

export async function CreateTaskCommentAction(
	organizationId: string,
	taskId: string,
	blockNote: PartialBlock[] | undefined,
	wsClientId: string
): Promise<{ success: boolean; data: { id: string }; skipped: boolean; error?: string }> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		blocknote: blockNote,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/task/create-comment`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 This ensures cookies are sent
	}).then(async (e) => await e.json());
	return result as { success: boolean; data: { id: string }; skipped: boolean; error?: string };
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
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-label`, {
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

export async function editLabelAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		color: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		color: data.color,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/edit-label`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit label");
		}
		return json;
	});

	return result;
}

export async function deleteLabelAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.labelType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/delete-label`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete label");
		}
		return json;
	});

	return result;
}
/**
 * Calls the `/admin/organization/create-view` API to create a new label in an organization.
 *
 * @param organizationId - The ID of the organization the label belongs to.
 * @param data - The label properties (name and value).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns The newly created label record.
 *
 * @example
 * ```ts
 * const view = await createSavedViewAction("org_123", {
 *   name: "Bug",
 *   value: "W1tbInBy",
 * });
 * if (view.success) {
 *   console.log("Created View:", view.data);
 * }
 * ```
 */
export async function createSavedViewAction(
	organizationId: string,
	data: {
		name: string;
		value: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		value: data.value,
		wsClientId,
	};
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-view`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create view");
		}
		return json;
	});

	return result;
}

/**
 * Calls the `/admin/organization/create-category` API to create a category in an organization.
 *
 * @param organizationId - The ID of the organization the label belongs to.
 * @param data - The label properties (name and color).
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns The newly created category record.
 *
 * @example
 * ```ts
 * const category = await createCategoryAction("org_123", {
 *   name: "Bug",
 *   color: "#ff0000",
 * });
 * if (category.success) {
 *   console.log("Created category:", category.data);
 * }
 * ```
 */
export async function createCategoryAction(
	organizationId: string,
	data: {
		name: string;
		color: string;
		icon: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		name: data.name,
		color: data.color,
		icon: data.icon,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/create-category`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to create category");
		}
		return json;
	});

	return result;
}

export async function editCategoryAction(
	organizationId: string,
	data: {
		id: string;
		name: string;
		color: string;
		icon: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		name: data.name,
		color: data.color,
		icon: data.icon,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/edit-category`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to edit category");
		}
		return json;
	});

	return result;
}

export async function deleteCategoryAction(
	organizationId: string,
	data: {
		id: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.categoryType[]; error?: string }> {
	const payload = {
		org_id: organizationId,
		id: data.id,
		wsClientId,
	};

	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/delete-category`, {
		method: "DELETE",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to delete category");
		}
		return json;
	});

	return result;
}

/**
 * Fetches all tasks assigned to the current logged-in user across all projects and organizations.
 *
 * @returns A promise resolving to { success: boolean; data: TaskWithLabels[]; error?: string }
 *
 * @example
 * ```ts
 * const result = await getMyTasksAction();
 * if (result.success) {
 *   console.log("My tasks:", result.data);
 * }
 * ```
 */
export async function getMyTasksAction(): Promise<{
	success: boolean;
	data?: schema.TaskWithLabels[];
	error?: string;
}> {
	const result = await fetch(`${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/tasks/mine`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include", // 👈 ensures cookies/session are sent
	}).then(async (res) => {
		const json = await res.json();
		if (!res.ok) {
			throw new Error(json?.error || "Failed to fetch tasks");
		}
		return json;
	});

	return result;
}

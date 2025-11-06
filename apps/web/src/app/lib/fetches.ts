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
 * Calls the `/admin/organization/update` API to update an organization's details.
 *
 * Sends a POST request containing updated organization data.
 * Supports WebSocket broadcast by including the `wsClientId`.
 *
 * @param organizationId - The ID of the organization to update.
 * @param data - The properties of the organization to update:
 * - `name` (required) - The organization's display name.
 * - `slug` (required) - The unique slug for URLs.
 * - `logo` (optional) - The URL or path to the organization logo.
 * - `bannerImg` (optional) - The URL or path to the banner image.
 * - `description` (optional) - The text description of the organization.
 * @param wsClientId - The WebSocket client ID (used to push broadcast updates).
 * @returns A promise resolving to:
 * - `success` — Indicates whether the update succeeded.
 * - `data` — The updated organization record.
 * - `error` — Optional error message if update fails.
 *
 * @example
 * ```ts
 * const result = await updateOrganizationAction(
 *   "org_123",
 *   {
 *     name: "New Org Name",
 *     slug: "new-org-slug",
 *     description: "An updated description",
 *   },
 *   "client_456"
 * );
 *
 * if (result.success) {
 *   console.log("Organization updated:", result.data);
 * } else {
 *   console.error("Failed to update:", result.error);
 * }
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
 * Calls the `/admin/organization/{orgId}/logo` API to upload an organization's logo.
 *
 * Uploads a new image for the organization's logo. Optionally replaces an existing logo if specified.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The logo file to upload.
 * @param old - The URL of the logo file being replaced, or null if uploading for the first time.
 * @returns A promise resolving to:
 * - `success` — Whether the upload succeeded.
 * - `image` — The storage/CDN URL of the uploaded logo.
 * - `orgId` — The organization ID that received the new logo.
 * - `originalName` — The original filename of the uploaded image.
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector("input[type='file']");
 * if (fileInput.files?.[0]) {
 *   const result = await uploadOrganizationLogo("org_123", fileInput.files[0]);
 *   console.log("Uploaded logo:", result.image);
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
 * Calls the `/admin/organization/{orgId}/banner` API to upload an organization's banner image.
 *
 * Replaces or adds a new banner image for the given organization.
 *
 * @param organizationId - The ID of the organization.
 * @param file - The banner image file to upload.
 * @param old - The URL of the previous banner, or null if adding a new one.
 * @returns A promise resolving to:
 * - `success` — Whether the upload succeeded.
 * - `image` — The storage/CDN URL of the new banner.
 * - `orgId` — The organization ID the banner was uploaded for.
 * - `originalName` — The original filename of the uploaded banner.
 *
 * @example
 * ```ts
 * const file = new File(["...binary"], "banner.png", { type: "image/png" });
 * const result = await uploadOrganizationBanner("org_123", file, null);
 * console.log("Banner updated:", result.image);
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
 *
 * Updates one or more fields of an existing task record.
 * Only the fields provided in `data` will be updated.
 *
 * @param organizationId - The ID of the organization the task belongs to.
 * @param taskId - The ID of the task to update.
 * @param data - The fields to update on the task:
 * - `title` (optional) - The new task title.
 * - `description` (optional) - The updated description (array of editor blocks).
 * - `status` (optional) - The new status ID, or `null` to remove it.
 * - `priority` (optional) - The new priority ID, or `null` to remove it.
 * - `category` (optional) - The new category ID, or `null` to remove it.
 * @param wsClientId - The WebSocket client ID (used for broadcasting real-time updates).
 * @returns A promise resolving to:
 * - `success` — Indicates whether the update succeeded.
 * - `data` — The updated task record (including labels, assignees, and timeline).
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
 * Calls the `/admin/organization/task/update-labels` API to update a task's labels.
 *
 * Replaces all existing labels on the specified task with the provided list.
 *
 * @param organizationId - The ID of the organization the task belongs to.
 * @param taskId - The ID of the task being updated.
 * @param labels - Array of label IDs to assign to the task.
 * @param wsClientId - The WebSocket client ID (used for pushing live updates).
 * @returns A promise resolving to:
 * - `success` — Whether the update succeeded.
 * - `data` — The updated task record (with labels, assignees, and timeline).
 * - `skipped` — Indicates whether an update was skipped.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const result = await updateLabelToTaskAction(
 *   "org_123",
 *   "task_789",
 *   ["label_bug", "label_ui"],
 *   "ws_client_001"
 * );
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

/**
 * Calls the `/admin/organization/task/update-assignees` API to update a task's assignees.
 *
 * Replaces the existing assignees of a task with the provided list of user IDs.
 *
 * @param organizationId - The ID of the organization the task belongs to.
 * @param taskId - The ID of the task being updated.
 * @param assignees - Array of user IDs to assign to the task.
 * @param wsClientId - The WebSocket client ID (for pushing live updates).
 * @returns A promise resolving to:
 * - `success` — Whether the update succeeded.
 * - `data` — The updated task record with new assignees.
 * - `skipped` — Indicates whether any changes were applied.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const result = await updateAssigneesToTaskAction(
 *   "org_123",
 *   "task_789",
 *   ["user_001", "user_002"],
 *   "ws_client_456"
 * );
 * ```
 */
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

/**
 * Calls the `/admin/organization/task/create-comment` API to add a new comment to a task.
 *
 * Creates a comment attached to a specified task using the provided BlockNote content.
 *
 * @param organizationId - The ID of the organization.
 * @param taskId - The ID of the task to comment on.
 * @param blockNote - The comment content as an array of BlockNote editor blocks.
 * @param wsClientId - The WebSocket client ID (used for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the comment creation succeeded.
 * - `data` — Object containing the `id` of the new comment.
 * - `skipped` — Indicates whether creation was skipped.
 * - `error` — Optional error message if the operation failed.
 *
 * @example
 * ```ts
 * const comment = await CreateTaskCommentAction(
 *   "org_123",
 *   "task_777",
 *   [{ type: "paragraph", content: "Looks good!" }],
 *   "ws_client_001"
 * );
 * console.log("New comment:", comment.data.id);
 * ```
 */
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
 * Calls the `/admin/organization/create-label` API to create new labels in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties:
 * - `name` (required) - The label name.
 * - `color` (required) - The label hex color code.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the label creation succeeded.
 * - `data` — An array of label records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const labels = await createLabelAction("org_123", {
 *   name: "Bug",
 *   color: "#ff0000"
 * }, "ws_123");
 *
 * if (labels.success) console.log("Created labels:", labels.data);
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

/**
 * Calls the `/admin/organization/edit-label` API to update an existing label in an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties to update:
 * - `id` (required) - The ID of the label to update.
 * - `name` (required) - The updated label name.
 * - `color` (required) - The updated label hex color code.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the label update succeeded.
 * - `data` — An array of label records returned by the server.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const labels = await editLabelAction("org_123", {
 *   id: "label_001",
 *   name: "Priority",
 *   color: "#FFD700",
 * }, "ws_456");
 *
 * if (labels.success) console.log("Updated labels:", labels.data);
 * ```
 */
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

/**
 * Calls the `/admin/organization/delete-label` API to delete a label from an organization.
 *
 * @param organizationId - The ID of the organization the labels belong to.
 * @param data - The label properties for deletion:
 * - `id` (required) - The ID of the label to delete.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the label was deleted successfully.
 * - `data` — An array of remaining label records returned by the server.
 * - `error` — Optional error message if deletion failed.
 *
 * @example
 * ```ts
 * const labels = await deleteLabelAction("org_123", { id: "label_002" }, "ws_789");
 * if (labels.success) console.log("Labels after deletion:", labels.data);
 * ```
 */
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
 * Calls the `/admin/organization/create-view` API to create a saved view in an organization.
 *
 * @param organizationId - The ID of the organization the views belong to.
 * @param data - The view properties:
 * - `name` (required) - The name of the view.
 * - `value` (required) - The encoded filter or configuration string.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the view creation succeeded.
 * - `data` — An array of saved view records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const views = await createSavedViewAction("org_123", {
 *   name: "My Open Tasks",
 *   value: "W1tbInJmIl0=",
 * }, "ws_001");
 *
 * if (views.success) console.log("Created views:", views.data);
 * ```
 */
export async function createSavedViewAction(
	organizationId: string,
	data: {
		name: string;
		value: string;
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.savedViewType[]; error?: string }> {
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
 * Calls the `/admin/organization/create-category` API to create a new category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties:
 * - `name` (required) - The name of the category.
 * - `color` (required) - The hex color of the category.
 * - `icon` (required) - The icon identifier for the category.
 * @param wsClientId - The WebSocket client ID (for broadcasting updates).
 * @returns A promise resolving to:
 * - `success` — Whether the category creation succeeded.
 * - `data` — An array of category records created or returned by the server.
 * - `error` — Optional error message if creation failed.
 *
 * @example
 * ```ts
 * const categories = await createCategoryAction("org_123", {
 *   name: "Bug Reports",
 *   color: "#FF0000",
 *   icon: "bug"
 * }, "ws_777");
 *
 * if (categories.success) console.log("Created categories:", categories.data);
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

/**
 * Calls the `/admin/organization/edit-category` API to update an existing category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties to update:
 * - `id` (required) - The ID of the category to update.
 * - `name` (required) - The updated category name.
 * - `color` (required) - The updated category color.
 * - `icon` (required) - The updated category icon.
 * @param wsClientId - The WebSocket client ID (used for pushing updates).
 * @returns A promise resolving to:
 * - `success` — Whether the category update succeeded.
 * - `data` — An array of updated category records returned by the server.
 * - `error` — Optional error message if the update failed.
 *
 * @example
 * ```ts
 * const categories = await editCategoryAction("org_123", {
 *   id: "cat_001",
 *   name: "Improvements",
 *   color: "#2ECC71",
 *   icon: "wrench"
 * }, "ws_002");
 *
 * if (categories.success) console.log("Updated categories:", categories.data);
 * ```
 */
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

/**
 * Calls the `/admin/organization/delete-category` API to delete a category in an organization.
 *
 * @param organizationId - The ID of the organization the categories belong to.
 * @param data - The category properties for deletion:
 * - `id` (required) - The ID of the category to delete.
 * @param wsClientId - The WebSocket client ID (for pushing changes).
 * @returns A promise resolving to:
 * - `success` — Whether the category was deleted successfully.
 * - `data` — An array of remaining category records returned by the server.
 * - `error` — Optional error message if deletion failed.
 *
 * @example
 * ```ts
 * const categories = await deleteCategoryAction("org_123", { id: "cat_003" }, "ws_010");
 *
 * if (categories.success) console.log("Remaining categories:", categories.data);
 * ```
 */
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
 * Calls the `/admin/tasks/mine` API to fetch all tasks assigned to the current user.
 *
 * Retrieves all tasks assigned to the authenticated user across all organizations.
 *
 * @returns A promise resolving to:
 * - `success` — Whether the request succeeded.
 * - `data` — An array of tasks (`TaskWithLabels[]`) assigned to the current user.
 * - `error` — Optional error message if the request failed.
 *
 * @example
 * ```ts
 * const result = await getMyTasksAction();
 * if (result.success) console.log("My tasks:", result.data);
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

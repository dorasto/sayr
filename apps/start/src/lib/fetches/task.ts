import type { schema } from "@repo/database";
import type { NodeJSON } from "prosekit/core";

const API_URL = import.meta.env.VITE_EXTERNAL_API_URL;

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
		description: NodeJSON | undefined;
		status: string | undefined | null;
		priority: string | undefined | null;
		labels: string[];
		category?: string | null;
		assignees?: string[];
	},
	wsClientId: string
): Promise<{ success: boolean; data: schema.TaskWithLabels; error?: string }> {
	console.info("Creating task", { organizationId, title: data.title });
	const result = await fetch(`${API_URL}/admin/organization/task/create`, {
		method: "POST",
		body: JSON.stringify({
			org_id: organizationId,
			wsClientId,
			title: data.title,
			description: data.description,
			status: data.status,
			priority: data.priority,
			labels: data.labels,
			category: data.category,
			assignees: data.assignees,
		}),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to create task", {
			error: result.error,
			organizationId,
		});
	}
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
		description?: NodeJSON;
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

	console.info("Updating task", {
		organizationId,
		taskId,
		updates: Object.keys(data),
	});

	const result = await fetch(`${API_URL}/admin/organization/task/update`, {
		method: "PATCH",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	if (!result.success) {
		console.error("Failed to update task", {
			error: result.error,
			organizationId,
			taskId,
		});
	}
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
): Promise<{
	success: boolean;
	data: schema.TaskWithLabels;
	skipped: boolean;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		labels: labels,
	};

	const result = await fetch(`${API_URL}/admin/organization/task/update-labels`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	return result as {
		success: boolean;
		data: schema.TaskWithLabels;
		skipped: boolean;
		error?: string;
	};
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
): Promise<{
	success: boolean;
	data: schema.TaskWithLabels;
	skipped: boolean;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		assignees: assignees,
	};

	const result = await fetch(`${API_URL}/admin/organization/task/update-assignees`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	return result as {
		success: boolean;
		data: schema.TaskWithLabels;
		skipped: boolean;
		error?: string;
	};
}

/**
 * Calls the `/admin/organization/task/create-comment` API to add a new comment to a task.
 *
 * Creates a comment attached to a specified task using the provided content.
 *
 * @param organizationId - The ID of the organization.
 * @param taskId - The ID of the task to comment on.
 * @param content - The comment content as an array of content editor blocks.
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
	content: NodeJSON | undefined,
	visibility: schema.taskCommentType["visibility"],
	wsClientId: string
): Promise<{
	success: boolean;
	data: { id: string };
	skipped: boolean;
	error?: string;
}> {
	const payload = {
		org_id: organizationId,
		wsClientId,
		task_id: taskId,
		visibility: visibility,
		content: content,
	};

	const result = await fetch(`${API_URL}/admin/organization/task/create-comment`, {
		method: "POST",
		body: JSON.stringify(payload),
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
	}).then(async (e) => await e.json());
	return result as {
		success: boolean;
		data: { id: string };
		skipped: boolean;
		error?: string;
	};
}

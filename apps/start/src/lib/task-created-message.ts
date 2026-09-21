import type { schema } from "@repo/database";

/**
 * "This client just created a task" — a same-window message (sendWindowMessage / onWindowMessage, the
 * convention `timeline-update` and `SSE_RECONNECTED` already use), posted by the create-task dialog once
 * the API has answered.
 *
 * It exists because the create request carries this client's `sseClientId`, so the server deliberately
 * leaves this client out of the `CREATE_TASK` broadcast (it is assumed to apply the response itself) — and
 * the dialog is mounted globally, far from whichever page holds the task list. Any page that keeps a task
 * list live can subscribe and apply the record; the /home board does, through the same reducer path as an SSE
 * `CREATE_TASK` (see applyLanderWindowMessage in lib/board/apply-lander-event.ts). Org pages still append
 * from the dialog's own `setTasks` prop and can adopt this later.
 *
 * Pure (types + guards only) so the reducer's tests can import it without a browser.
 */
export const TASK_CREATED_MESSAGE_TYPE = "task-created";

export interface TaskCreatedMessage {
	type: typeof TASK_CREATED_MESSAGE_TYPE;
	/** The record the create endpoint returned (`getTaskById`): no `.organization` badge data, that's the receiver's job. */
	payload: schema.TaskWithLabels;
}

export function createTaskCreatedMessage(task: schema.TaskWithLabels): TaskCreatedMessage {
	return { type: TASK_CREATED_MESSAGE_TYPE, payload: task };
}

/**
 * A complete task record (what `getTaskById` returns and every task broadcast carries), as opposed to a
 * partial payload. Every row/card reads `task.labels` / `task.assignees` unguarded, hence the array checks.
 */
export function isTaskRecord(value: unknown): value is schema.TaskWithLabels {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		typeof value.id === "string" &&
		"organizationId" in value &&
		typeof value.organizationId === "string" &&
		"labels" in value &&
		Array.isArray(value.labels) &&
		"assignees" in value &&
		Array.isArray(value.assignees)
	);
}

/** The created task from any window message, or null when it isn't a well-formed task-created message. */
export function readTaskCreatedMessage(message: unknown): schema.TaskWithLabels | null {
	if (typeof message !== "object" || message === null) return null;
	if (!("type" in message) || message.type !== TASK_CREATED_MESSAGE_TYPE) return null;
	if (!("payload" in message) || !isTaskRecord(message.payload)) return null;
	return message.payload;
}

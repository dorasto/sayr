import { formatTaskKey } from "@repo/util";
import { apiRequest } from "../../lib/client";
import { resolveOrgShortId } from "../../lib/orgs";
import type { Task, TaskPriority, TaskStatus, TaskVisibility } from "../../types";

export const STATUSES: TaskStatus[] = ["backlog", "todo", "in-progress", "done", "canceled"];
export const PRIORITIES: TaskPriority[] = ["none", "low", "medium", "high", "urgent"];
export const VISIBILITIES: TaskVisibility[] = ["public", "private"];

/** `GET /tasks/<task>` — a short id or an id. What `task view` shows, and what the guided prompts read first. */
export function fetchTask(orgId: string, taskId: string): Promise<Task> {
	return apiRequest<Task>(`/tasks/${encodeURIComponent(taskId)}`, { query: { orgId } });
}

/** `SAY-123` via `formatTaskKey`, or `#123` when the caller has no short id on record for this organization. */
export async function taskKey(orgId: string, task: Pick<Task, "shortId">): Promise<string> {
	const orgShortId = await resolveOrgShortId(orgId);
	return orgShortId ? formatTaskKey(orgShortId, task.shortId) : `#${task.shortId ?? "?"}`;
}

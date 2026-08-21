import type { schema } from "@repo/database";

// Shared by TaskViewDropdown (popover UI), unified-task-view (applies the
// sort), and view-detail.tsx (settings-page saved-view editor) — one
// definition of "what can tasks be sorted by" instead of three.
export type TaskSortField = "priority" | "voteCount" | "createdAt" | "updatedAt" | "status";
export type TaskSortDirection = "asc" | "desc";

export const TASK_SORT_FIELDS: Array<{ id: TaskSortField; label: string }> = [
	{ id: "priority", label: "Priority" },
	{ id: "voteCount", label: "Votes" },
	{ id: "createdAt", label: "Created date" },
	{ id: "updatedAt", label: "Updated date" },
	{ id: "status", label: "Status" },
];

// Lower number = earlier in an ascending sort.
export const PRIORITY_ORDER: Record<string, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
	none: 4,
};

export const STATUS_ORDER: Record<string, number> = {
	"in-progress": 0,
	todo: 1,
	backlog: 2,
	done: 3,
	canceled: 4,
};

/**
 * Sorts a copy of `tasks` by `sortBy`/`sortDirection`. Grouping functions
 * (TASK_GROUPINGS in shared/config.tsx) only ever push tasks in input
 * order, so sorting once here — before grouping — is sufficient to sort
 * within every group and sub-group without touching any grouping function.
 */
export function sortTasks(
	tasks: schema.TaskWithLabels[],
	sortBy: TaskSortField | undefined,
	sortDirection: TaskSortDirection = "asc"
): schema.TaskWithLabels[] {
	if (!sortBy) return tasks;
	const dir = sortDirection === "desc" ? -1 : 1;

	const compare = (a: schema.TaskWithLabels, b: schema.TaskWithLabels): number => {
		switch (sortBy) {
			case "priority":
				return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
			case "status":
				return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
			case "voteCount":
				return (a.voteCount ?? 0) - (b.voteCount ?? 0);
			case "createdAt":
				return (
					(a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0)
				);
			case "updatedAt":
				return (
					(a.updatedAt ? new Date(a.updatedAt).getTime() : 0) - (b.updatedAt ? new Date(b.updatedAt).getTime() : 0)
				);
			default:
				return 0;
		}
	};

	return [...tasks].sort((a, b) => dir * compare(a, b));
}

import type { schema } from "@repo/database";

// Field-agnostic (no dependency on FilterField).
export type TaskSortField = "priority" | "voteCount" | "createdAt" | "updatedAt" | "status";
/** The release entity's sort fields (components/releases/release-board-entity.tsx). */
export type ReleaseSortField = "targetDate" | "releasedAt" | "createdAt" | "name";
/** Any entity's sort field — what the view state's `sortBy` may hold. */
export type BoardSortField = TaskSortField | ReleaseSortField;
export type TaskSortDirection = "asc" | "desc";

/** One "Sort by" menu entry an entity offers. */
export interface BoardSortFieldOption {
	id: BoardSortField;
	label: string;
}

const TASK_SORT_FIELD_IDS: ReadonlySet<string> = new Set<TaskSortField>([
	"priority",
	"voteCount",
	"createdAt",
	"updatedAt",
	"status",
]);

/** Whether `value` is a task sort field — the only ones a saved view's `viewConfig.sortBy` can store. */
export function isTaskSortField(value: string | undefined): value is TaskSortField {
	return value !== undefined && TASK_SORT_FIELD_IDS.has(value);
}

/** Milliseconds for a nullable date (null/absent = 0, so undated items sort first ascending). */
export function dateValue(value: Date | string | null | undefined): number {
	return value ? new Date(value).getTime() : 0;
}

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
 * (board/config/groupings.ts) only ever push tasks in input order, so
 * sorting once here — before grouping — is sufficient to sort within every
 * group and sub-group without touching any grouping function.
 */
export function sortTasks(
	tasks: readonly schema.TaskWithLabels[],
	sortBy: BoardSortField | undefined,
	sortDirection: TaskSortDirection = "asc"
): readonly schema.TaskWithLabels[] {
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
				return dateValue(a.createdAt) - dateValue(b.createdAt);
			case "updatedAt":
				return dateValue(a.updatedAt) - dateValue(b.updatedAt);
			default:
				return 0;
		}
	};

	return [...tasks].sort((a, b) => dir * compare(a, b));
}

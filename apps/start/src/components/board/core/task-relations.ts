import type { TaskItem } from "./board-item";

// Which tasks the context menu offers for "Set parent" / "Add relation". A fork of the eligibility rules
// in components/tasks/actions/{parent,relations}.tsx (the board may not import components/tasks/**, and
// those files build JSX options with `@/` imports vitest can't resolve). The writes themselves go through
// BoardItemActions.setParent/addRelation (core/task-board-provider.tsx). Pure — see task-relations.test.ts.

/** A relation the board can create between two tasks — same values as `RelationType` in components/tasks/actions/relations.tsx. */
export type BoardRelationType = "blocking" | "related" | "duplicate";

export const BOARD_RELATION_TYPES: readonly { value: BoardRelationType; label: string }[] = [
	{ value: "blocking", label: "Blocking" },
	{ value: "related", label: "Related to" },
	{ value: "duplicate", label: "Duplicate of" },
];

type RelationCandidate = Pick<TaskItem, "id" | "organizationId" | "parentId" | "subtaskCount">;

/**
 * Tasks `task` may be nested under: same org, not itself, and only top-level tasks without subtasks of
 * their own (nesting is single-level). Its current parent is always listed (it has subtasks — this one),
 * so the picker can show what's selected.
 */
export function getEligibleParentTasks<T extends RelationCandidate>(
	task: Pick<TaskItem, "id" | "organizationId" | "parentId">,
	tasks: readonly T[]
): T[] {
	return tasks.filter(
		(candidate) =>
			candidate.id !== task.id &&
			candidate.organizationId === task.organizationId &&
			(candidate.id === task.parentId || (!candidate.parentId && (candidate.subtaskCount ?? 0) === 0))
	);
}

/** Tasks `task` may be related to: any other task in the same org. */
export function getRelationTargetTasks<T extends Pick<TaskItem, "id" | "organizationId">>(
	task: Pick<TaskItem, "id" | "organizationId">,
	tasks: readonly T[]
): T[] {
	return tasks.filter((candidate) => candidate.id !== task.id && candidate.organizationId === task.organizationId);
}

/** Case-insensitive match of a search query against a task's key and title; an empty query matches all. */
export function matchesTaskSearch(task: { title: string | null; shortId: number | null }, key: string, query: string) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return `${key} ${task.title ?? ""} ${task.shortId ?? ""}`.toLowerCase().includes(needle);
}

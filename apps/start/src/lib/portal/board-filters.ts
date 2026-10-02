import { type PortalDateInput, toTime } from "./time";

export type BoardTab = "active" | "done" | "all";
export type BoardSort = "newest" | "mostPopular" | "updated";

/** Statuses shown under the Active tab. */
export const ACTIVE_STATUSES: readonly string[] = ["backlog", "todo", "in-progress"];
/** Statuses shown under the Done tab. */
export const DONE_STATUSES: readonly string[] = ["done"];

export interface BoardTask {
	id: string;
	status: string;
	category?: string | null;
	labels?: ReadonlyArray<{ id: string }>;
	voteCount: number;
	createdAt?: PortalDateInput;
	updatedAt?: PortalDateInput;
}

export interface BoardFilterState {
	tab: BoardTab;
	/** Category id, or null/undefined for all categories. */
	categoryId?: string | null;
	/** Keep tasks carrying ANY of these label ids. Empty/undefined = no label filter. */
	labelIds?: ReadonlyArray<string>;
	/** Keep only these raw statuses. Empty/undefined = no status filter. */
	statuses?: ReadonlyArray<string>;
}

/** Status set for a tab, or `null` for All (every status). */
export function getTabStatuses(tab: BoardTab): readonly string[] | null {
	switch (tab) {
		case "active":
			return ACTIVE_STATUSES;
		case "done":
			return DONE_STATUSES;
		case "all":
			return null;
	}
}

/**
 * Whether a task belongs under a tab. `canceled` posts only appear under All, and only when the status filter
 * explicitly asks for them.
 */
export function matchesTab(task: { status: string }, tab: BoardTab, statuses?: ReadonlyArray<string>): boolean {
	const tabStatuses = getTabStatuses(tab);
	if (tabStatuses) return tabStatuses.includes(task.status);
	if (task.status === "canceled") return !!statuses?.includes("canceled");
	return true;
}

/** Applies tab, category, label and status filters to an already-loaded list. */
export function filterBoardTasks<T extends BoardTask>(tasks: ReadonlyArray<T>, filters: BoardFilterState): T[] {
	const { tab, categoryId, labelIds, statuses } = filters;
	return tasks.filter((task) => {
		if (!matchesTab(task, tab, statuses)) return false;
		if (categoryId && task.category !== categoryId) return false;
		if (labelIds && labelIds.length > 0 && !(task.labels ?? []).some((label) => labelIds.includes(label.id))) {
			return false;
		}
		if (statuses && statuses.length > 0 && !statuses.includes(task.status)) return false;
		return true;
	});
}

/** Number of loaded tasks under each tab (ignores category/label/status filters). */
export function countByTab(tasks: ReadonlyArray<{ status: string }>): Record<BoardTab, number> {
	return {
		active: tasks.filter((task) => matchesTab(task, "active")).length,
		done: tasks.filter((task) => matchesTab(task, "done")).length,
		all: tasks.filter((task) => matchesTab(task, "all")).length,
	};
}

/** Returns a sorted copy: newest first, most votes first (newest breaks ties), or most recently updated first. */
export function sortBoardTasks<T extends BoardTask>(tasks: ReadonlyArray<T>, sort: BoardSort): T[] {
	const created = (task: T) => toTime(task.createdAt) ?? 0;
	const updated = (task: T) => toTime(task.updatedAt) ?? created(task);

	return [...tasks].sort((a, b) => {
		switch (sort) {
			case "newest":
				return created(b) - created(a);
			case "mostPopular":
				return b.voteCount - a.voteCount || created(b) - created(a);
			case "updated":
				return updated(b) - updated(a);
		}
	});
}

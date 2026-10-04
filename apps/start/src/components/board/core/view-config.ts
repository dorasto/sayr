import type { schema } from "@repo/database";
import { deserializeFilters, serializeFilters } from "../filter/serialization";
import {
	DEFAULT_TASK_VIEW_STATE,
	type FilterState,
	type TaskGroupingId,
	type TaskViewCombinedState,
	type TaskViewState,
} from "../filter/types";

// Pure view-state mapping/equality, split out of filter/use-board-view-state.ts so it can be unit
// tested (apps/start's vitest has no `@/` alias — keep every import here relative or type-only).

/**
 * The view modes a saved view can persist. Mirrors `viewConfig.mode` in
 * packages/database/schema/saveView.schema.ts (a TS-typed jsonb, so widening it is type-only).
 * Page-local view ids (anything a page registers beyond these) are never persisted.
 */
export type PersistedViewMode = "list" | "kanban" | "card";

export const PERSISTED_VIEW_MODES: readonly PersistedViewMode[] = ["list", "kanban", "card"];

const FALLBACK_VIEW_MODE: PersistedViewMode = "list";

export function isPersistedViewMode(id: string): id is PersistedViewMode {
	return (PERSISTED_VIEW_MODES as readonly string[]).includes(id);
}

/**
 * Resolves a stored/URL view-mode id to one that can actually be rendered. Unknown or missing ids
 * fall back to "list" — old saved views, hand-edited URLs and modes a page doesn't offer must never
 * blank the board.
 *
 * With `availableIds` (the views the current page registers) the id must be one of those, and when
 * it isn't, "list" is used if available, else the first available id.
 */
export function resolveViewMode(id: string | undefined): PersistedViewMode;
export function resolveViewMode(id: string | undefined, availableIds: readonly string[]): string;
export function resolveViewMode(id: string | undefined, availableIds?: readonly string[]): string {
	if (availableIds) {
		if (id !== undefined && availableIds.includes(id)) return id;
		if (availableIds.includes(FALLBACK_VIEW_MODE)) return FALLBACK_VIEW_MODE;
		return availableIds[0] ?? FALLBACK_VIEW_MODE;
	}
	return id !== undefined && isPersistedViewMode(id) ? id : FALLBACK_VIEW_MODE;
}

/**
 * For the legacy org-scoped pages (components/tasks), which only ever offer List and Kanban: a
 * personal view saved with "card" (or anything unknown) is shown as "list" there. Same defensive
 * idea as `isOldGroupingId` in hooks/useTaskViewManager.ts.
 */
export function coerceToLegacyViewMode(mode: string | undefined): "list" | "kanban" {
	return mode === "kanban" ? "kanban" : "list";
}

/**
 * A page-local grouping id (the built-in "none", or one a page registers through `BoardProvider`'s `groupings`)
 * typed as the state's `grouping`. `TaskViewState.grouping` only names the persistable built-ins, but a
 * `controlled`/`memory` scope may hold any registered id: it is never written into a saved view. This is the one
 * place that narrowing is asserted; the registry resolves the id (unknown ids fall back to "status").
 */
export function pageLocalGrouping(id: string): TaskGroupingId {
	return id as TaskGroupingId;
}

export const DEFAULT_FILTER_STATE: FilterState = { groups: [], operator: "AND" };

export const DEFAULT_COMBINED_STATE: TaskViewCombinedState = {
	filters: DEFAULT_FILTER_STATE,
	viewConfig: DEFAULT_TASK_VIEW_STATE,
};

export function areFiltersEqual(a: FilterState, b: FilterState): boolean {
	return serializeFilters(a) === serializeFilters(b);
}

export function areViewConfigsEqual(a: TaskViewState, b: TaskViewState): boolean {
	return (
		a.grouping === b.grouping &&
		a.subGrouping === b.subGrouping &&
		a.viewMode === b.viewMode &&
		a.showCompletedTasks === b.showCompletedTasks &&
		(a.sortBy ?? "none") === (b.sortBy ?? "none") &&
		(a.sortDirection ?? "asc") === (b.sortDirection ?? "asc")
	);
}

export function areStatesEqual(a: TaskViewCombinedState, b: TaskViewCombinedState): boolean {
	return areFiltersEqual(a.filters, b.filters) && areViewConfigsEqual(a.viewConfig, b.viewConfig);
}

export function mapViewConfigToState(config: NonNullable<schema.savedViewType["viewConfig"]>): TaskViewState {
	return {
		grouping: config.groupBy,
		subGrouping: config.subGroupBy ?? "none",
		showCompletedTasks: config.showCompletedTasks,
		viewMode: resolveViewMode(config.mode),
		sortBy: config.sortBy ?? "none",
		sortDirection: config.sortDirection ?? "asc",
	};
}

/** Inverse of mapViewConfigToState — used to persist local view state back into a saved view's schema shape. */
export function mapStateToViewConfig(
	viewConfig: TaskViewState,
	iconColor: { icon: string; color: string }
): NonNullable<schema.savedViewType["viewConfig"]> {
	return {
		mode: viewConfig.viewMode,
		groupBy: viewConfig.grouping,
		subGroupBy: viewConfig.subGrouping,
		showCompletedTasks: viewConfig.showCompletedTasks,
		sortBy: viewConfig.sortBy,
		sortDirection: viewConfig.sortDirection,
		icon: iconColor.icon,
		color: iconColor.color,
	};
}

/** Resolves a saved view row into the same combined-state shape used everywhere else in the board's view state. */
export function getViewCombinedState(view: schema.savedViewType): TaskViewCombinedState {
	const filters = deserializeFilters(view.filterParams) || DEFAULT_FILTER_STATE;
	const viewConfig = view.viewConfig ? mapViewConfigToState(view.viewConfig) : DEFAULT_TASK_VIEW_STATE;
	return { filters, viewConfig };
}

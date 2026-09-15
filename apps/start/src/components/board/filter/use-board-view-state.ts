"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import {
	type FilterState,
	type FilterCondition,
	type FilterGroup,
	type FilterOperator,
	type TaskViewState,
	type TaskGroupingId,
	DEFAULT_TASK_VIEW_STATE,
} from "./types";
import { serializeFilters, deserializeFilters } from "./serialization";
import { mergeOrAppendCondition, toggleMultiValue as toggleValueHelper, updateConditionOperator } from "./multi-select";
import type { schema } from "@repo/database";

export type {
	FilterState,
	FilterCondition,
	FilterGroup,
	FilterOperator,
	FilterField,
	TaskViewState,
	TaskGroupingId,
} from "./types";

/**
 * The board's own combined filter + view-config + URL-sync state hook.
 *
 * Same engineering pattern as apps/start/src/hooks/useTaskViewManager.ts
 * (single combined state, throttled updates, URL sync) but genuinely
 * separate — not a copy of that file — because it needs to merge/evaluate
 * conditions against the board's own FIELD_CONFIGS (which includes "org"),
 * not the org-scoped system's. Reusing useTaskViewManager as-is would have
 * silently broken multi-select merging for the org filter, since its
 * mergeOrAppendCondition looks up field config in the old FILTER_FIELD_CONFIGS.
 *
 * useTasksSearchParams and useStateManagement are genuinely generic
 * (URL/state-sync infra with no field-vocabulary knowledge) and are reused
 * as-is.
 */
export interface TaskViewCombinedState {
	filters: FilterState;
	viewConfig: TaskViewState;
}

export const DEFAULT_FILTER_STATE: FilterState = { groups: [], operator: "AND" };
export { DEFAULT_TASK_VIEW_STATE };

export const DEFAULT_COMBINED_STATE: TaskViewCombinedState = {
	filters: DEFAULT_FILTER_STATE,
	viewConfig: DEFAULT_TASK_VIEW_STATE,
};

const BOARD_VIEW_COMBINED_KEY = "board-view-combined";

function areFiltersEqual(a: FilterState, b: FilterState): boolean {
	return serializeFilters(a) === serializeFilters(b);
}

function areViewConfigsEqual(a: TaskViewState, b: TaskViewState): boolean {
	return (
		a.grouping === b.grouping &&
		a.subGrouping === b.subGrouping &&
		a.viewMode === b.viewMode &&
		a.showCompletedTasks === b.showCompletedTasks &&
		(a.sortBy ?? "none") === (b.sortBy ?? "none") &&
		(a.sortDirection ?? "asc") === (b.sortDirection ?? "asc")
	);
}

function areStatesEqual(a: TaskViewCombinedState, b: TaskViewCombinedState): boolean {
	return areFiltersEqual(a.filters, b.filters) && areViewConfigsEqual(a.viewConfig, b.viewConfig);
}

function mapViewConfigToState(config: NonNullable<schema.savedViewType["viewConfig"]>): TaskViewState {
	return {
		grouping: config.groupBy,
		subGrouping: config.subGroupBy ?? "none",
		showCompletedTasks: config.showCompletedTasks,
		viewMode: config.mode,
		sortBy: config.sortBy ?? "none",
		sortDirection: config.sortDirection ?? "asc",
	};
}

export function useBoardViewState(availableViews?: schema.savedViewType[]) {
	const { view: viewSlug, category: categorySlug, filters: filtersParam, setSearchParams } = useTasksSearchParams();

	const isHandlingAction = useRef(false);
	const hasInitializedFromUrl = useRef(false);
	const lastUpdateTime = useRef(0);
	const pendingUpdate = useRef<{
		state: TaskViewCombinedState;
		urlParams: { view?: string | null; filters?: string | null; category?: string | null };
	} | null>(null);
	const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const THROTTLE_MS = 100;

	const { value: combinedState, setValue: setCombinedState } = useStateManagement<TaskViewCombinedState>(
		BOARD_VIEW_COMBINED_KEY,
		DEFAULT_COMBINED_STATE,
		1
	);

	const state = combinedState ?? DEFAULT_COMBINED_STATE;

	const filters = useMemo(() => state.filters, [state.filters]);
	const viewConfig = useMemo(() => state.viewConfig, [state.viewConfig]);

	const grouping = viewConfig.grouping;
	const subGrouping = viewConfig.subGrouping ?? "none";
	const viewMode = viewConfig.viewMode;
	const showCompletedTasks = viewConfig.showCompletedTasks;
	const sortBy = viewConfig.sortBy ?? "none";
	const sortDirection = viewConfig.sortDirection ?? "asc";

	const executeUpdate = useCallback(
		(
			newState: TaskViewCombinedState,
			urlParams: { view?: string | null; filters?: string | null; category?: string | null }
		) => {
			isHandlingAction.current = true;
			lastUpdateTime.current = Date.now();
			setCombinedState(newState);
			setSearchParams(urlParams);
			setTimeout(() => {
				isHandlingAction.current = false;
			}, 0);
		},
		[setCombinedState, setSearchParams]
	);

	const updateStateAndUrl = useCallback(
		(
			newState: TaskViewCombinedState,
			urlParams: { view?: string | null; filters?: string | null; category?: string | null }
		) => {
			const currentUrlView = viewSlug;
			const newUrlView = urlParams.view;
			const stateUnchanged = areStatesEqual(state, newState);
			const urlUnchanged = currentUrlView === newUrlView;

			if (stateUnchanged && urlUnchanged && categorySlug === (urlParams.category ?? null)) {
				return;
			}

			const now = Date.now();
			const timeSinceLastUpdate = now - lastUpdateTime.current;

			if (timeSinceLastUpdate >= THROTTLE_MS) {
				if (throttleTimeout.current) {
					clearTimeout(throttleTimeout.current);
					throttleTimeout.current = null;
				}
				pendingUpdate.current = null;
				executeUpdate(newState, urlParams);
				return;
			}

			pendingUpdate.current = { state: newState, urlParams };

			if (!throttleTimeout.current) {
				const timeToWait = THROTTLE_MS - timeSinceLastUpdate;
				throttleTimeout.current = setTimeout(() => {
					throttleTimeout.current = null;
					if (pendingUpdate.current) {
						executeUpdate(pendingUpdate.current.state, pendingUpdate.current.urlParams);
						pendingUpdate.current = null;
					}
				}, timeToWait);
			}
		},
		[executeUpdate, state, viewSlug, categorySlug]
	);

	const selectView = useCallback(
		(view: schema.savedViewType) => {
			const targetViewSlug = view.slug || view.id;
			if (viewSlug === targetViewSlug) return;

			const viewFilters = deserializeFilters(view.filterParams) || DEFAULT_FILTER_STATE;
			const viewConfigFromView = view.viewConfig ? mapViewConfigToState(view.viewConfig) : DEFAULT_TASK_VIEW_STATE;

			updateStateAndUrl(
				{ filters: viewFilters, viewConfig: viewConfigFromView },
				{ view: targetViewSlug, filters: null, category: null }
			);
		},
		[updateStateAndUrl, viewSlug]
	);

	const clearView = useCallback(
		(newFilters?: FilterState) => {
			const filtersToApply = newFilters || DEFAULT_FILTER_STATE;
			updateStateAndUrl(
				{ filters: filtersToApply, viewConfig: DEFAULT_TASK_VIEW_STATE },
				{
					view: null,
					filters: filtersToApply.groups.length > 0 ? serializeFilters(filtersToApply) : null,
					category: null,
				}
			);
		},
		[updateStateAndUrl]
	);

	/** Replace the current filters wholesale, keeping the current view config — for quick-filter chips. */
	const applyFilter = useCallback(
		(newFilters: FilterState) => {
			updateStateAndUrl(
				{ filters: newFilters, viewConfig: state.viewConfig },
				{
					view: null,
					filters: newFilters.groups.length > 0 ? serializeFilters(newFilters) : null,
					category: null,
				}
			);
		},
		[updateStateAndUrl, state.viewConfig]
	);

	const setFilters = useCallback(
		(newFilters: FilterState) => {
			if (areFiltersEqual(state.filters, newFilters)) return;

			isHandlingAction.current = true;
			setCombinedState({ ...state, filters: newFilters });

			if (!viewSlug) {
				setSearchParams({
					filters: newFilters.groups.length > 0 ? serializeFilters(newFilters) : null,
					category: null,
				});
			}

			setTimeout(() => {
				isHandlingAction.current = false;
			}, 0);
		},
		[state, setCombinedState, viewSlug, setSearchParams]
	);

	const addFilter = useCallback(
		(condition: FilterCondition) => {
			setFilters(mergeOrAppendCondition(state.filters, condition));
		},
		[state.filters, setFilters]
	);

	const removeFilter = useCallback(
		(filterId: string) => {
			const newGroups: FilterGroup[] = state.filters.groups
				.map((g) => ({ ...g, conditions: g.conditions.filter((c) => c.id !== filterId) }))
				.filter((g) => g.conditions.length > 0);
			setFilters({ ...state.filters, groups: newGroups });
		},
		[state.filters, setFilters]
	);

	const updateFilterOperator = useCallback(
		(filterId: string, operator: FilterOperator) => {
			setFilters(updateConditionOperator(state.filters, filterId, operator));
		},
		[state.filters, setFilters]
	);

	const toggleFilterValue = useCallback(
		(conditionId: string, value: string) => {
			setFilters(toggleValueHelper(state.filters, conditionId, value));
		},
		[state.filters, setFilters]
	);

	const clearFilters = useCallback(() => setFilters(DEFAULT_FILTER_STATE), [setFilters]);

	const setViewConfig = useCallback(
		(updates: Partial<TaskViewState>) => {
			const newViewConfig = { ...state.viewConfig, ...updates };
			if (areViewConfigsEqual(state.viewConfig, newViewConfig)) return;
			setCombinedState({ ...state, viewConfig: newViewConfig });
		},
		[state, setCombinedState]
	);

	const setGrouping = useCallback((grouping: TaskGroupingId) => setViewConfig({ grouping }), [setViewConfig]);
	const setSubGrouping = useCallback(
		(subGrouping: TaskGroupingId | "none") => setViewConfig({ subGrouping }),
		[setViewConfig]
	);
	const setViewMode = useCallback((viewMode: "list" | "kanban") => setViewConfig({ viewMode }), [setViewConfig]);
	const setShowCompletedTasks = useCallback(
		(showCompletedTasks: boolean) => setViewConfig({ showCompletedTasks }),
		[setViewConfig]
	);
	const setSortBy = useCallback((sortBy: TaskViewState["sortBy"]) => setViewConfig({ sortBy }), [setViewConfig]);
	const setSortDirection = useCallback(
		(sortDirection: TaskViewState["sortDirection"]) => setViewConfig({ sortDirection }),
		[setViewConfig]
	);

	// Auto-load saved view from URL on mount
	useEffect(() => {
		if (!viewSlug || isHandlingAction.current || hasInitializedFromUrl.current || !availableViews) return;

		const targetView = availableViews.find((v) => v.slug === viewSlug || v.id === viewSlug);
		if (!targetView) return;

		const viewFilters = deserializeFilters(targetView.filterParams) || DEFAULT_FILTER_STATE;
		const viewConfigFromView = targetView.viewConfig
			? mapViewConfigToState(targetView.viewConfig)
			: DEFAULT_TASK_VIEW_STATE;
		const targetState = { filters: viewFilters, viewConfig: viewConfigFromView };

		if (!areStatesEqual(state, targetState)) {
			isHandlingAction.current = true;
			hasInitializedFromUrl.current = true;
			setCombinedState(targetState);
			setTimeout(() => {
				isHandlingAction.current = false;
			}, 0);
		} else {
			hasInitializedFromUrl.current = true;
		}
	}, [viewSlug, availableViews, state, setCombinedState]);

	// Auto-load filters from URL on mount
	useEffect(() => {
		if (viewSlug || isHandlingAction.current || hasInitializedFromUrl.current) return;
		if (!filtersParam) return;

		const urlFilters = deserializeFilters(filtersParam);
		if (!urlFilters) return;

		const targetState = { ...state, filters: urlFilters };
		if (!areStatesEqual(state, targetState)) {
			isHandlingAction.current = true;
			hasInitializedFromUrl.current = true;
			setCombinedState(targetState);
			setTimeout(() => {
				isHandlingAction.current = false;
			}, 0);
		} else {
			hasInitializedFromUrl.current = true;
		}
	}, [viewSlug, filtersParam, state, setCombinedState]);

	return {
		filters,
		viewConfig,
		viewSlug,
		categorySlug,
		grouping,
		subGrouping,
		viewMode,
		showCompletedTasks,
		sortBy,
		sortDirection,
		selectView,
		clearView,
		applyFilter,
		setFilters,
		addFilter,
		removeFilter,
		updateFilterOperator,
		toggleFilterValue,
		clearFilters,
		setViewConfig,
		setGrouping,
		setSubGrouping,
		setViewMode,
		setShowCompletedTasks,
		setSortBy,
		setSortDirection,
		isHandlingAction,
	};
}

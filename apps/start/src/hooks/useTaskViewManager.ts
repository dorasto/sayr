"use client";

import type { schema } from "@repo/database";
import { useCallback, useMemo, useRef } from "react";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useTasksSearchParams } from "./useTasksSearchParams";
import {
	type FilterState,
	type FilterCondition,
	type FilterGroup,
	type FilterOperator,
	type FilterField,
	type TaskViewState,
	type TaskGroupingId,
	DEFAULT_TASK_VIEW_STATE,
} from "@/components/tasks/filter/types";
import {
	serializeFilters,
	deserializeFilters,
} from "@/components/tasks/filter/serialization";
import {
	mergeOrAppendCondition,
	toggleMultiValue as toggleValueHelper,
	updateConditionOperator,
} from "@/components/tasks/filter/multi-select";

// Re-export types for convenience
export type {
	FilterState,
	FilterCondition,
	FilterGroup,
	FilterOperator,
	FilterField,
	TaskViewState,
	TaskGroupingId,
} from "@/components/tasks/filter/types";

// Combined state that we manage as a single unit
export interface TaskViewCombinedState {
	filters: FilterState;
	viewConfig: TaskViewState;
}

// Defaults
export const DEFAULT_FILTER_STATE: FilterState = { groups: [], operator: "AND" };
export { DEFAULT_TASK_VIEW_STATE };

export const DEFAULT_COMBINED_STATE: TaskViewCombinedState = {
	filters: DEFAULT_FILTER_STATE,
	viewConfig: DEFAULT_TASK_VIEW_STATE,
};

// Single query key for all task view state
const TASK_VIEW_COMBINED_KEY = "task-view-combined";

/**
 * Maps a saved view's config to TaskViewState
 */
function mapViewConfigToState(
	config: NonNullable<schema.savedViewType["viewConfig"]>
): TaskViewState {
	return {
		grouping: config.groupBy,
		showEmptyGroups: config.showEmptyGroups,
		showCompletedTasks: config.showCompletedTasks,
		viewMode: config.mode,
	};
}

/**
 * Consolidated hook for managing task view state.
 *
 * This combines filter state, view config, and URL params into a single
 * management point to minimize re-renders when switching views.
 *
 * Benefits:
 * - Single TanStack Query key for filters + view config
 * - Atomic updates reduce re-render cascades
 * - URL state is updated in sync with internal state
 * - Provides both granular setters and batch operations
 */
export function useTaskViewManager() {
	const { view: viewSlug, setSearchParams } = useTasksSearchParams();

	// Track click handling to prevent useEffect from duplicating updates
	const isHandlingAction = useRef(false);

	// Single state for filters + view config
	const { value: combinedState, setValue: setCombinedState } = useStateManagement<TaskViewCombinedState>(
		TASK_VIEW_COMBINED_KEY,
		DEFAULT_COMBINED_STATE,
		1,
	);

	const state = combinedState ?? DEFAULT_COMBINED_STATE;

	// Memoized selectors for individual pieces (prevents unnecessary re-renders)
	const filters = useMemo(() => state.filters, [state.filters]);
	const viewConfig = useMemo(() => state.viewConfig, [state.viewConfig]);

	// Convenience accessors for viewConfig properties
	const grouping = viewConfig.grouping;
	const viewMode = viewConfig.viewMode;
	const showEmptyGroups = viewConfig.showEmptyGroups;
	const showCompletedTasks = viewConfig.showCompletedTasks;

	/**
	 * Internal helper to update state and URL atomically
	 */
	const updateStateAndUrl = useCallback((
		newState: TaskViewCombinedState,
		urlParams: { view?: string | null; filters?: string | null }
	) => {
		isHandlingAction.current = true;
		setCombinedState(newState);
		setSearchParams(urlParams);
		// Reset flag after current event loop
		setTimeout(() => {
			isHandlingAction.current = false;
		}, 0);
	}, [setCombinedState, setSearchParams]);

	/**
	 * Switch to a saved view - updates everything atomically
	 */
	const selectView = useCallback((view: schema.savedViewType) => {
		const viewFilters = deserializeFilters(view.filterParams) || DEFAULT_FILTER_STATE;
		const viewConfigFromView = view.viewConfig
			? mapViewConfigToState(view.viewConfig)
			: DEFAULT_TASK_VIEW_STATE;

		updateStateAndUrl(
			{ filters: viewFilters, viewConfig: viewConfigFromView },
			{ view: view.slug || view.id, filters: null }
		);
	}, [updateStateAndUrl]);

	/**
	 * Clear current view and reset to defaults (optionally with new filters)
	 */
	const clearView = useCallback((newFilters?: FilterState) => {
		const filtersToApply = newFilters || DEFAULT_FILTER_STATE;

		updateStateAndUrl(
			{ filters: filtersToApply, viewConfig: DEFAULT_TASK_VIEW_STATE },
			{
				view: null,
				filters: filtersToApply.groups.length > 0 ? serializeFilters(filtersToApply) : null,
			}
		);
	}, [updateStateAndUrl]);

	/**
	 * Apply a filter (used by sidebar for category, priority, assignee filters)
	 */
	const applyFilter = useCallback((newFilters: FilterState) => {
		updateStateAndUrl(
			{ filters: newFilters, viewConfig: DEFAULT_TASK_VIEW_STATE },
			{
				view: null,
				filters: newFilters.groups.length > 0 ? serializeFilters(newFilters) : null,
			}
		);
	}, [updateStateAndUrl]);

	/**
	 * Update filters (for filter dropdown UI) - doesn't change view config
	 */
	const setFilters = useCallback((newFilters: FilterState) => {
		isHandlingAction.current = true;
		setCombinedState({ ...state, filters: newFilters });

		// Update URL if not in a saved view
		if (!viewSlug) {
			setSearchParams({
				filters: newFilters.groups.length > 0 ? serializeFilters(newFilters) : null,
			});
		}

		setTimeout(() => {
			isHandlingAction.current = false;
		}, 0);
	}, [state, setCombinedState, viewSlug, setSearchParams]);

	/**
	 * Add a filter condition (merges with existing if same field)
	 */
	const addFilter = useCallback((condition: FilterCondition) => {
		const newFilters = mergeOrAppendCondition(state.filters, condition);
		setFilters(newFilters);
	}, [state.filters, setFilters]);

	/**
	 * Remove a filter condition by ID
	 */
	const removeFilter = useCallback((filterId: string) => {
		const newGroups: FilterGroup[] = state.filters.groups
			.map((g) => ({
				...g,
				conditions: g.conditions.filter((c) => c.id !== filterId),
			}))
			.filter((g) => g.conditions.length > 0);
		setFilters({ ...state.filters, groups: newGroups });
	}, [state.filters, setFilters]);

	/**
	 * Update a filter's operator
	 */
	const updateFilterOperator = useCallback((filterId: string, operator: FilterOperator) => {
		setFilters(updateConditionOperator(state.filters, filterId, operator));
	}, [state.filters, setFilters]);

	/**
	 * Toggle a value in a multi-select filter
	 */
	const toggleFilterValue = useCallback((conditionId: string, value: string) => {
		setFilters(toggleValueHelper(state.filters, conditionId, value));
	}, [state.filters, setFilters]);

	/**
	 * Clear all filters
	 */
	const clearFilters = useCallback(() => {
		setFilters(DEFAULT_FILTER_STATE);
	}, [setFilters]);

	/**
	 * Update view config (grouping, viewMode, etc.) - doesn't change filters
	 */
	const setViewConfig = useCallback((updates: Partial<TaskViewState>) => {
		setCombinedState({
			...state,
			viewConfig: { ...state.viewConfig, ...updates },
		});
	}, [state, setCombinedState]);

	// Granular setters for view config
	const setGrouping = useCallback(
		(grouping: TaskGroupingId) => setViewConfig({ grouping }),
		[setViewConfig]
	);

	const setViewMode = useCallback(
		(viewMode: "list" | "kanban") => setViewConfig({ viewMode }),
		[setViewConfig]
	);

	const setShowEmptyGroups = useCallback(
		(showEmptyGroups: boolean) => setViewConfig({ showEmptyGroups }),
		[setViewConfig]
	);

	const setShowCompletedTasks = useCallback(
		(showCompletedTasks: boolean) => setViewConfig({ showCompletedTasks }),
		[setViewConfig]
	);

	return {
		// Current state
		filters,
		viewConfig,
		viewSlug,

		// Convenience accessors
		grouping,
		viewMode,
		showEmptyGroups,
		showCompletedTasks,

		// View operations
		selectView,
		clearView,
		applyFilter,

		// Filter operations
		setFilters,
		addFilter,
		removeFilter,
		updateFilterOperator,
		toggleFilterValue,
		clearFilters,

		// View config operations
		setViewConfig,
		setGrouping,
		setViewMode,
		setShowEmptyGroups,
		setShowCompletedTasks,

		// For checking if we're in the middle of an action (prevents duplicate updates)
		isHandlingAction,
	};
}

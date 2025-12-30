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
 * Check if two filter states are equal
 */
function areFiltersEqual(a: FilterState, b: FilterState): boolean {
	return serializeFilters(a) === serializeFilters(b);
}

/**
 * Check if two view configs are equal
 */
function areViewConfigsEqual(a: TaskViewState, b: TaskViewState): boolean {
	return (
		a.grouping === b.grouping &&
		a.viewMode === b.viewMode &&
		a.showEmptyGroups === b.showEmptyGroups &&
		a.showCompletedTasks === b.showCompletedTasks
	);
}

/**
 * Check if two combined states are equal
 */
function areStatesEqual(a: TaskViewCombinedState, b: TaskViewCombinedState): boolean {
	return areFiltersEqual(a.filters, b.filters) && areViewConfigsEqual(a.viewConfig, b.viewConfig);
}

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

	// Throttle mechanism to prevent rapid clicks from causing issues
	const lastUpdateTime = useRef(0);
	const pendingUpdate = useRef<{
		state: TaskViewCombinedState;
		urlParams: { view?: string | null; filters?: string | null };
	} | null>(null);
	const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const THROTTLE_MS = 100; // Minimum time between updates

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
	 * Internal helper to execute the actual state + URL update
	 */
	const executeUpdate = useCallback((
		newState: TaskViewCombinedState,
		urlParams: { view?: string | null; filters?: string | null }
	) => {
		isHandlingAction.current = true;
		lastUpdateTime.current = Date.now();
		setCombinedState(newState);
		setSearchParams(urlParams);
		// Reset flag after current event loop
		setTimeout(() => {
			isHandlingAction.current = false;
		}, 0);
	}, [setCombinedState, setSearchParams]);

	/**
	 * Internal helper to update state and URL atomically with throttling.
	 * Prevents rapid clicks from overwhelming the system.
	 * - Skips update entirely if nothing actually changes (prevents unnecessary re-renders)
	 * - If enough time has passed, executes immediately
	 * - If called too rapidly, queues the latest update and executes after throttle period
	 */
	const updateStateAndUrl = useCallback((
		newState: TaskViewCombinedState,
		urlParams: { view?: string | null; filters?: string | null }
	) => {
		// CRITICAL: Skip if nothing actually changes - this prevents re-render cascades
		const currentUrlView = viewSlug;
		const newUrlView = urlParams.view;
		const stateUnchanged = areStatesEqual(state, newState);
		const urlUnchanged = currentUrlView === newUrlView;

		if (stateUnchanged && urlUnchanged) {
			// Nothing to do - early return prevents unnecessary updates
			return;
		}

		const now = Date.now();
		const timeSinceLastUpdate = now - lastUpdateTime.current;

		// If enough time has passed, execute immediately
		if (timeSinceLastUpdate >= THROTTLE_MS) {
			// Clear any pending scheduled update
			if (throttleTimeout.current) {
				clearTimeout(throttleTimeout.current);
				throttleTimeout.current = null;
			}
			pendingUpdate.current = null;
			executeUpdate(newState, urlParams);
			return;
		}

		// Otherwise, queue this update (replacing any previous pending update)
		pendingUpdate.current = { state: newState, urlParams };

		// Schedule execution if not already scheduled
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
	}, [executeUpdate, state, viewSlug]);

	/**
	 * Switch to a saved view - updates everything atomically
	 */
	const selectView = useCallback((view: schema.savedViewType) => {
		const targetViewSlug = view.slug || view.id;

		// Skip if already on this view
		if (viewSlug === targetViewSlug) {
			return;
		}

		const viewFilters = deserializeFilters(view.filterParams) || DEFAULT_FILTER_STATE;
		const viewConfigFromView = view.viewConfig
			? mapViewConfigToState(view.viewConfig)
			: DEFAULT_TASK_VIEW_STATE;

		updateStateAndUrl(
			{ filters: viewFilters, viewConfig: viewConfigFromView },
			{ view: targetViewSlug, filters: null }
		);
	}, [updateStateAndUrl, viewSlug]);

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
		// Skip if filters haven't actually changed
		if (areFiltersEqual(state.filters, newFilters)) {
			return;
		}

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
		const newViewConfig = { ...state.viewConfig, ...updates };

		// Skip if view config hasn't actually changed
		if (areViewConfigsEqual(state.viewConfig, newViewConfig)) {
			return;
		}

		setCombinedState({
			...state,
			viewConfig: newViewConfig,
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

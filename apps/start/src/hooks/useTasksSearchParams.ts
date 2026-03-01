/**
 * Task search params hook using shallow URL updates.
 *
 * This replaces nuqs usage for task-related search params because:
 * 1. nuqs doesn't fully support TanStack Start (experimental only)
 * 2. Using History API directly prevents triggering route loaders
 * 3. Prevents unnecessary server calls when switching views/filters
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";

// Custom event name that TanStack Router doesn't listen to
const SEARCH_PARAMS_CHANGE_EVENT = "task-search-params-change";

// Subscribe to our custom event (NOT popstate, which TanStack Router listens to)
function subscribeToUrl(callback: () => void) {
	window.addEventListener(SEARCH_PARAMS_CHANGE_EVENT, callback);
	// Also listen to popstate for browser back/forward (but we won't dispatch it ourselves)
	window.addEventListener("popstate", callback);
	return () => {
		window.removeEventListener(SEARCH_PARAMS_CHANGE_EVENT, callback);
		window.removeEventListener("popstate", callback);
	};
}

function getUrlSnapshot() {
	if (typeof window === "undefined") return "";
	return window.location.search;
}

function getServerSnapshot() {
	return "";
}

/**
 * Hook to get and set task-related search params using shallow URL updates.
 * Uses History API directly to avoid triggering TanStack Router loaders.
 */
export function useTasksSearchParams() {
	// Subscribe to URL changes for reactivity
	const searchString = useSyncExternalStore(subscribeToUrl, getUrlSnapshot, getServerSnapshot);

	// Parse current search params
	const searchParams = useMemo(() => {
		if (typeof window === "undefined") return new URLSearchParams();
		return new URLSearchParams(searchString);
	}, [searchString]);

	// Get individual params
	const filters = useMemo(() => searchParams.get("filters") ?? "", [searchParams]);
	const view = useMemo(() => searchParams.get("view") ?? null, [searchParams]);
	const category = useMemo(() => searchParams.get("category") ?? null, [searchParams]);
	const task = useMemo(() => {
		const taskParam = searchParams.get("task");
		return taskParam ? Number.parseInt(taskParam, 10) : 0;
	}, [searchParams]);

	// Helper to update URL without triggering navigation
	const updateUrl = useCallback((updates: Record<string, string | null>) => {
		if (typeof window === "undefined") return;

		const url = new URL(window.location.href);

		for (const [key, value] of Object.entries(updates)) {
			if (value === null || value === "" || value === "0") {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value);
			}
		}

		// Use replaceState to update URL without triggering navigation
		window.history.replaceState(window.history.state, "", url.toString());

		// Dispatch our custom event to notify React components (NOT popstate which triggers TanStack Router)
		window.dispatchEvent(new CustomEvent(SEARCH_PARAMS_CHANGE_EVENT));
	}, []);

	// Individual setters
	const setFilters = useCallback(
		(value: string | null) => {
			updateUrl({ filters: value });
		},
		[updateUrl]
	);

	const setView = useCallback(
		(value: string | null) => {
			updateUrl({ view: value });
		},
		[updateUrl]
	);

	const setCategory = useCallback(
		(value: string | null) => {
			updateUrl({ category: value });
		},
		[updateUrl]
	);

	const setTask = useCallback(
		(value: number | null) => {
			updateUrl({ task: value ? String(value) : null });
		},
		[updateUrl]
	);

	// Batch setter for multiple params at once
	const setSearchParams = useCallback(
		(params: { filters?: string | null; view?: string | null; task?: number | null; category?: string | null }) => {
			const updates: Record<string, string | null> = {};

			if (params.filters !== undefined) {
				updates.filters = params.filters;
			}
			if (params.view !== undefined) {
				updates.view = params.view;
			}
			if (params.category !== undefined) {
				updates.category = params.category;
			}
			if (params.task !== undefined) {
				updates.task = params.task ? String(params.task) : null;
			}

			updateUrl(updates);
		},
		[updateUrl]
	);

	// Clear all task search params
	const clearSearchParams = useCallback(() => {
		updateUrl({ filters: null, view: null, task: null, category: null });
	}, [updateUrl]);

	return {
		// Current values
		filters,
		view,
		task,
		category,

		// Individual setters
		setFilters,
		setView,
		setTask,
		setCategory,

		// Batch setter
		setSearchParams,

		// Clear all
		clearSearchParams,
	};
}

/**
 * Hook specifically for the view query param.
 * Provides a simpler API similar to nuqs useQueryState.
 */
export function useViewParam() {
	const { view, setView } = useTasksSearchParams();

	return [view, setView] as const;
}

/**
 * Hook specifically for the filters query param.
 * Provides a simpler API similar to nuqs useQueryState.
 */
export function useFiltersParam() {
	const { filters, setFilters } = useTasksSearchParams();

	return [filters, setFilters] as const;
}

/**
 * Hook specifically for the category query param.
 * Provides a simpler API similar to nuqs useQueryState.
 */
export function useCategoryParam() {
	const { category, setCategory } = useTasksSearchParams();

	return [category, setCategory] as const;
}

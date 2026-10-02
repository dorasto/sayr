import {
	DEFAULT_TASK_VIEW_STATE,
	type FilterState,
	type TaskViewCombinedState,
	type TaskViewState,
} from "../filter/types";
import { DEFAULT_COMBINED_STATE, DEFAULT_FILTER_STATE } from "./view-config";

// Pure half of core/scope.tsx (cache-key derivation, persistence predicates, initial-state merge) —
// kept free of React and `@/` imports so vitest can cover it.

/**
 * How a board's view state (filters + grouping/sort/view mode) is held and persisted:
 * - "url+personal": the signed-in admin board — `?view`/`?filters` URL sync plus saved (personal) views.
 * - "url": `?filters` URL sync only; `?view` is not a saved-view pointer here and no personal views load.
 * - "memory": local state only, keyed by the scope key.
 * - "controlled": the host owns the state (`BoardScope.controlled`); no URL sync, no saved views.
 */
export type BoardPersistence = "url+personal" | "url" | "memory" | "controlled";

export interface BoardScopeControlled {
	state: TaskViewCombinedState;
	onChange: (next: TaskViewCombinedState) => void;
}

export interface BoardScope {
	/** Names this board's view state; distinct boards on one page must use distinct keys. */
	key: string;
	persistence: BoardPersistence;
	/** Starting state for non-default scopes (public pages: showCompletedTasks true, grouping none, no sort). */
	initial?: Partial<TaskViewState> & { filters?: FilterState };
	/** Required when `persistence` is "controlled" (without it the scope degrades to "memory"). */
	controlled?: BoardScopeControlled;
}

/** The key of the admin /home board — the only scope that predates scopes. */
export const LEGACY_BOARD_SCOPE_KEY = "home";

/** The query-cache key the admin board's view state has always lived under; do not rename. */
export const LEGACY_VIEW_STATE_CACHE_KEY = "board-view-combined";

/** The scope in effect when no BoardScopeProvider is mounted — exactly the board's pre-scope behaviour. */
export const LEGACY_BOARD_SCOPE: BoardScope = {
	key: LEGACY_BOARD_SCOPE_KEY,
	persistence: "url+personal",
};

/** Query-cache key for a scope's view state. "home" maps to the legacy global key. */
export function deriveViewStateCacheKey(scopeKey: string): string {
	return scopeKey === LEGACY_BOARD_SCOPE_KEY
		? LEGACY_VIEW_STATE_CACHE_KEY
		: `${LEGACY_VIEW_STATE_CACHE_KEY}:${scopeKey}`;
}

/**
 * The persistence a scope actually runs with: "controlled" without a `controlled` handle can't
 * work, so it behaves as "memory" rather than throwing.
 */
export function resolvePersistence(scope: BoardScope): BoardPersistence {
	return scope.persistence === "controlled" && !scope.controlled ? "memory" : scope.persistence;
}

/** Whether the board reads/writes `?filters` (and, with personal views, `?view`). */
export function syncsUrl(persistence: BoardPersistence): boolean {
	return persistence === "url+personal" || persistence === "url";
}

/** Whether saved/personal views are loaded and selectable. */
export function usesPersonalViews(persistence: BoardPersistence): boolean {
	return persistence === "url+personal";
}

/** Whether the host owns the state instead of the board's own query-cache entry. */
export function isControlledPersistence(persistence: BoardPersistence): boolean {
	return persistence === "controlled";
}

/**
 * The state a scope starts from (and what "clear view" returns to). Without `initial` this is the
 * shared default constant itself — the admin board's reference-stable default.
 */
export function resolveInitialState(initial: BoardScope["initial"]): TaskViewCombinedState {
	if (!initial) return DEFAULT_COMBINED_STATE;
	const { filters, ...viewConfig } = initial;
	return {
		filters: filters ?? DEFAULT_FILTER_STATE,
		viewConfig: { ...DEFAULT_TASK_VIEW_STATE, ...viewConfig },
	};
}

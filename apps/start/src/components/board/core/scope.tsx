import { createContext, type ReactNode, useContext } from "react";
import { type BoardScope, LEGACY_BOARD_SCOPE } from "./scope-config";

export type { BoardPersistence, BoardScope, BoardScopeControlled } from "./scope-config";
export { LEGACY_BOARD_SCOPE } from "./scope-config";

const BoardScopeContext = createContext<BoardScope>(LEGACY_BOARD_SCOPE);

interface BoardScopeProviderProps {
	/** Should be referentially stable (memoise it) — callers derive state from its fields. */
	scope: BoardScope;
	children: ReactNode;
}

/** Tells `useBoardViewState()` (called with no args all over the board) which scope it is in. */
export function BoardScopeProvider({ scope, children }: BoardScopeProviderProps) {
	return <BoardScopeContext.Provider value={scope}>{children}</BoardScopeContext.Provider>;
}

/**
 * The enclosing board's view-state scope. With no BoardScopeProvider mounted this is the legacy
 * admin scope (key "home", global cache key, `?view`/`?filters` URL sync, personal views), so every
 * existing caller behaves exactly as before.
 */
export function useBoardScope(): BoardScope {
	return useContext(BoardScopeContext);
}

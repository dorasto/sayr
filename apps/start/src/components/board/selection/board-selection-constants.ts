// The useTaskSelection storage key of the legacy /home board scope. Board call sites don't
// pass this directly: they call `useBoardSelectionKey()` (core/scope.tsx), which derives a
// per-scope key from it (core/scope-config.ts `deriveSelectionCacheKey`) so every row, card and
// the bulk bar of ONE board share a cache entry while two boards' selections never leak into
// each other. /home's scope maps back to exactly this key.
export const BOARD_TASK_SELECTION_KEY = "board-task-selection";

// Shared useTaskSelection storage key for the board — every board-row.tsx,
// board-card.tsx, and board.tsx call site passes this same key so they all
// read/write the identical TanStack Query cache entry without needing a
// selection value/context threaded through props.
export const BOARD_TASK_SELECTION_KEY = "board-task-selection";

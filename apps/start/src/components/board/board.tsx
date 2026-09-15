import type { schema } from "@repo/database";
import { BoardViewShell } from "./views/board-view-shell";

interface BoardProps {
	tasks: schema.TaskWithLabels[];
}

/**
 * Top-level assembled board component. Currently a thin pass-through to
 * BoardViewShell — filter/quick-filter/saved-view/layout wiring lands in
 * later build-order steps (7-9), at which point this component grows to
 * assemble the top bar, side panel, and filtered task list together.
 */
export function Board({ tasks }: BoardProps) {
	return <BoardViewShell tasks={tasks} />;
}

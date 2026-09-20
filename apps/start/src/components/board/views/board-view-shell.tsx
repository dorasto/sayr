import type { schema } from "@repo/database";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardListView } from "./board-list-view";

interface BoardViewShellProps {
	tasks: schema.TaskWithLabels[];
}

/** Dispatches already filtered/sorted board tasks to the selected presentation. */
export function BoardViewShell({ tasks }: BoardViewShellProps) {
	const { viewMode } = useBoardViewState();

	return viewMode === "kanban" ? <BoardKanbanView tasks={tasks} /> : <BoardListView tasks={tasks} />;
}

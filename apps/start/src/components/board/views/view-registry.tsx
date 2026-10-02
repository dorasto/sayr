import { IconLayoutGrid, IconLayoutKanban, IconLayoutList } from "@tabler/icons-react";
import { useBoardViewsOverride } from "../core/board-data";
import type { TaskItem } from "../core/board-item";
import { BoardCardView } from "./board-card-view";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardListView } from "./board-list-view";
import { useBoardViewState } from "../filter/use-board-view-state";
import { type BoardViewDefinition, getBoardView } from "./view-registry-model";

export { type BoardViewDefinition, type BoardViewSupports, getBoardView } from "./view-registry-model";

// Thin adapters: the registry contract is `{ items }`; the existing views take `{ tasks }`.
function ListViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardListView tasks={items} />;
}

function KanbanViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardKanbanView tasks={items} />;
}

export const LIST_VIEW: BoardViewDefinition = {
	id: "list",
	label: "List",
	icon: <IconLayoutList className="h-4 w-4" />,
	component: ListViewAdapter,
	supports: { grouping: true, subGrouping: true, drag: true, sort: true, subtasks: "nested" },
};

export const KANBAN_VIEW: BoardViewDefinition = {
	id: "kanban",
	label: "Kanban",
	icon: <IconLayoutKanban className="h-4 w-4" />,
	component: KanbanViewAdapter,
	supports: { grouping: true, subGrouping: true, drag: true, sort: true, subtasks: "flat" },
	// Kanban columns bring their own edge-to-edge chrome; the host must not pad around it.
	fullBleed: true,
};

export const CARD_VIEW: BoardViewDefinition = {
	id: "card",
	label: "Card",
	icon: <IconLayoutGrid className="h-4 w-4" />,
	component: BoardCardView,
	supports: { grouping: true, subGrouping: false, drag: false, sort: true, subtasks: "flat" },
};

/** The views a board offers when its provider registers none of its own: what the admin /home gets. */
export const DEFAULT_BOARD_VIEWS: readonly BoardViewDefinition[] = [LIST_VIEW, KANBAN_VIEW, CARD_VIEW];

/** The views registered on the surrounding `BoardProvider` (`DEFAULT_BOARD_VIEWS` when it gave none). */
export function useBoardViews(): readonly BoardViewDefinition[] {
	return useBoardViewsOverride() ?? DEFAULT_BOARD_VIEWS;
}

/** The view the board is currently showing: the persisted/URL view mode resolved against the registry. */
export function useActiveBoardView(): BoardViewDefinition {
	const { viewMode } = useBoardViewState();
	return getBoardView(viewMode, useBoardViews());
}

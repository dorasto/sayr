import { IconLayoutGrid, IconLayoutKanban, IconLayoutList } from "@tabler/icons-react";
import { useBoardViewsOverride } from "../core/board-data";
import type { TaskItem } from "../core/board-item";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardCardView } from "./board-card-view";
import { BoardKanbanView } from "./board-kanban-view";
import { BoardListView } from "./board-list-view";
import { type BoardViewDefinition, getBoardView } from "./view-registry-model";

export { type BoardViewDefinition, type BoardViewSupports, getBoardView } from "./view-registry-model";

// Thin adapters: the registry contract is `{ items }`; the existing views take `{ tasks }`.
function ListViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardListView tasks={items} />;
}

function FlatListViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardListView tasks={items} flatSubtasks />;
}

function KanbanViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardKanbanView tasks={items} />;
}

function PageScrollKanbanViewAdapter({ items }: { items: readonly TaskItem[] }) {
	return <BoardKanbanView tasks={items} pageScroll />;
}

export const LIST_VIEW: BoardViewDefinition = {
	id: "list",
	label: "List",
	icon: <IconLayoutList className="h-4 w-4" />,
	component: ListViewAdapter,
	supports: { grouping: true, subGrouping: true, drag: true, sort: true, subtasks: "nested" },
};

/** The list with every task its own row in the given order (no subtask nesting): for server-ranked lists. */
export const FLAT_LIST_VIEW: BoardViewDefinition = {
	...LIST_VIEW,
	component: FlatListViewAdapter,
	supports: { ...LIST_VIEW.supports, subtasks: "flat" },
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

/** The kanban for a host page that scrolls as a whole (no bounded height): columns at natural height. */
export const PAGE_SCROLL_KANBAN_VIEW: BoardViewDefinition = { ...KANBAN_VIEW, component: PageScrollKanbanViewAdapter };

export const CARD_VIEW: BoardViewDefinition = {
	id: "card",
	label: "Card",
	icon: <IconLayoutGrid className="h-4 w-4" />,
	component: BoardCardView,
	supports: { grouping: true, subGrouping: false, drag: false, sort: true, subtasks: "flat" },
};

/**
 * The views a board offers when its provider registers none of its own: what the admin /home gets. `CARD_VIEW` is for
 * pages that register it; a saved admin view still set to "card" falls back to the list.
 */
export const DEFAULT_BOARD_VIEWS: readonly BoardViewDefinition[] = [LIST_VIEW, KANBAN_VIEW];

/** The views registered on the surrounding `BoardProvider` (`DEFAULT_BOARD_VIEWS` when it gave none). */
export function useBoardViews(): readonly BoardViewDefinition[] {
	return useBoardViewsOverride() ?? DEFAULT_BOARD_VIEWS;
}

/** The view the board is currently showing: the persisted/URL view mode resolved against the registry. */
export function useActiveBoardView(): BoardViewDefinition {
	const { viewMode } = useBoardViewState();
	return getBoardView(viewMode, useBoardViews());
}

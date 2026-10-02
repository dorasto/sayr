import type { TaskItem } from "@/components/board/core/board-item";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope-config";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import { DEFAULT_TASK_VIEW_STATE, type TaskViewCombinedState } from "@/components/board/filter/types";
import { BoardListView } from "@/components/board/views/board-list-view";
import { LIST_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { ListContainer } from "../ui/ListContainer";
import { PublicBoardRow } from "./PublicBoardRow";
import { ShowMorePosts } from "./ShowMorePosts";

// Everything the public Feedback board hands `BoardProvider`, as module-level constants (the provider wants
// stable identities). The page (`PublicTaskView`) supplies only the data.

/** The public board never edits, selects, drags or saves views. */
export const PUBLIC_BOARD_CAPABILITIES = READ_ONLY_CAPABILITIES;

function PublicListViewAdapter({ items }: { items: readonly TaskItem[] }) {
	// The public endpoint is ranked server-side: a post whose parent is also loaded stays in its own ranked slot.
	return <BoardListView tasks={items} flatSubtasks />;
}

/** The list as the public board shows it: the board's read-only list, every post a flat top-level row. */
const PUBLIC_LIST_VIEW: BoardViewDefinition = {
	...LIST_VIEW,
	component: PublicListViewAdapter,
	supports: { ...LIST_VIEW.supports, drag: false, subtasks: "flat" },
};

/** The Feedback board is list-only. */
export const PUBLIC_BOARD_VIEWS: readonly BoardViewDefinition[] = [PUBLIC_LIST_VIEW];

export const PUBLIC_BOARD_RENDERERS: BoardRenderers = {
	row: PublicBoardRow,
	listContainer: ListContainer,
	footer: ShowMorePosts,
};

/** One stable scope: controlled, list view, no grouping, completed posts shown, no board-side sort. */
export const PUBLIC_BOARD_SCOPE: BoardScope = (() => {
	// The host (the page's toolbar) owns what is shown; the board only reads this state, so changes are ignored.
	const state: TaskViewCombinedState = {
		filters: DEFAULT_FILTER_STATE,
		viewConfig: {
			...DEFAULT_TASK_VIEW_STATE,
			grouping: pageLocalGrouping("none"),
			subGrouping: "none",
			showCompletedTasks: true,
			sortBy: "none",
			viewMode: "list",
		},
	};
	return {
		key: "public-board",
		persistence: "controlled",
		initial: state.viewConfig,
		controlled: { state, onChange: () => {} },
	};
})();

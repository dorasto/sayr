import { useMemo } from "react";
import { resolveGroupingDefinition } from "./config/grouping-registry";
import {
	useBoardCapabilities,
	useBoardData,
	useBoardGroupings,
	useBoardRenderers,
	useBoardTheme,
} from "./core/board-data";
import { resolveBoardState } from "./core/renderers";
import { applyFilters } from "./filter/filter-config";
import { sortTasks } from "./filter/sort-config";
import { useBoardViewState } from "./filter/use-board-view-state";
import { usePersonalViews } from "./saved-views/use-personal-views";
import { BoardBulkActionBar } from "./selection/board-bulk-action-bar";
import { BoardViewShell } from "./views/board-view-shell";

/**
 * Top-level assembled board component. Applies the filter/sort/completed-
 * visibility state before handing tasks down to BoardViewShell. The
 * FilterBuilder/BoardViewOptions controls that drive this state live in the
 * page's own PageHeader.Toolbar (see pages/admin/home/index.tsx), matching
 * every other admin page's TaskFilterDropdown-in-PageHeader.Toolbar
 * pattern — not mounted inside Board itself, which takes no props (its items
 * come from the surrounding BoardProvider via `useBoardData()`) and has no
 * page-chrome opinions.
 *
 * A task hidden by `showCompletedTasks=false` or an active filter condition
 * can still surface as a subtask under a visible parent (or get promoted to
 * top-level if its own parent got filtered out) — see
 * config/groupings.ts's getTopLevelTasks/buildSubtaskMap, which already
 * fall back correctly since they only ever look at whatever task list they
 * receive, not the full unfiltered set.
 */
export function Board() {
	const { items: tasks, status, passthrough = false } = useBoardData();
	const { states } = useBoardRenderers();
	const { canBulk } = useBoardCapabilities();
	const theme = useBoardTheme();
	const { personalViews } = usePersonalViews();
	const { filters, grouping, showCompletedTasks, sortBy, sortDirection } = useBoardViewState(personalViews);
	const groupings = useBoardGroupings();
	// A grouping that owns membership (e.g. a roadmap) decides which items appear and in what order,
	// so the board's own completed-visibility filter and sort stand aside; user filters still apply.
	const ownsMembership = resolveGroupingDefinition(groupings, grouping).ownsMembership === true;

	const visibleTasks = useMemo(() => {
		// The host already filtered/ordered these (see BoardDataSource.passthrough): show them as given.
		if (passthrough) return tasks;
		const filtered = applyFilters(tasks, filters);
		if (ownsMembership) return filtered;
		const scoped = showCompletedTasks
			? filtered
			: filtered.filter((task) => task.status !== "done" && task.status !== "canceled");
		return sortBy !== "none" ? sortTasks(scoped, sortBy, sortDirection) : scoped;
	}, [tasks, passthrough, filters, ownsMembership, showCompletedTasks, sortBy, sortDirection]);

	// While the data source loads/failed/has nothing, a page's `renderers.states` replaces the views
	// (undefined = render the views as usual; the admin source has no status, so it always does).
	const stateContent = resolveBoardState(status, visibleTasks.length, states);

	// `contents` = no box of its own, so layout (the host's flex/height sizing, grid-board's
	// `h-full`) is exactly as if this wrapper weren't here; it exists only to carry the theme
	// attribute, which custom properties inherit through regardless of display.
	return (
		<div data-board-theme={theme} className="contents">
			{stateContent !== undefined ? stateContent : <BoardViewShell tasks={visibleTasks} />}
			{canBulk && <BoardBulkActionBar tasks={visibleTasks} />}
		</div>
	);
}

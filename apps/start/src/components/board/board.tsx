import { useMemo } from "react";
import { resolveGroupingDefinition } from "./config/grouping-registry";
import {
	useBoardCapabilities,
	useBoardEntity,
	useBoardGroupings,
	useBoardItemsData,
	useBoardRenderers,
} from "./core/board-data";
import { arrangeBoardItems } from "./core/entity";
import { resolveBoardState } from "./core/renderers";
import { useBoardViewState } from "./filter/use-board-view-state";
import { useBoardSavedViews } from "./saved-views/use-board-saved-views";
import { BoardViewShell } from "./views/board-view-shell";

/**
 * Top-level assembled board component. Applies the filter/sort/completed-
 * visibility state before handing tasks down to BoardViewShell. The
 * FilterBuilder/BoardViewOptions controls that drive this state live in the
 * page's own PageHeader.Toolbar (see pages/admin/home/index.tsx), matching
 * every other admin page's TaskFilterDropdown-in-PageHeader.Toolbar
 * pattern — not mounted inside Board itself, which takes no props (its items
 * come from the surrounding BoardProvider via `useBoardItemsData()`) and has no
 * page-chrome opinions. What the items are (filter fields, completed predicate, sort, rows/cards, bulk bar)
 * comes from the provider's entity (core/entity.ts; tasks by default).
 *
 * A task hidden by `showCompletedTasks=false` or an active filter condition
 * can still surface as a subtask under a visible parent (or get promoted to
 * top-level if its own parent got filtered out) — see
 * config/groupings.ts's getTopLevelTasks/buildSubtaskMap, which already
 * fall back correctly since they only ever look at whatever task list they
 * receive, not the full unfiltered set.
 */
export function Board() {
	const { items, status, passthrough = false } = useBoardItemsData();
	const entity = useBoardEntity();
	const { states } = useBoardRenderers();
	const { canBulk } = useBoardCapabilities();
	const { views: savedViews } = useBoardSavedViews();
	const { filters, grouping, showCompletedTasks, sortBy, sortDirection } = useBoardViewState(savedViews);
	const groupings = useBoardGroupings();
	// A grouping that owns membership (e.g. a roadmap) decides which items appear and in what order,
	// so the board's own completed-visibility filter and sort stand aside; user filters still apply.
	const ownsMembership = resolveGroupingDefinition(groupings, grouping).ownsMembership === true;

	const visibleItems = useMemo(
		() =>
			// The host already filtered/ordered these (see BoardDataSource.passthrough): show them as given.
			passthrough
				? items
				: arrangeBoardItems(entity, items, {
						filters,
						showCompleted: showCompletedTasks,
						sortBy,
						sortDirection,
						ownsMembership,
					}),
		[entity, items, passthrough, filters, ownsMembership, showCompletedTasks, sortBy, sortDirection]
	);

	// While the data source loads/failed/has nothing, a page's `renderers.states` replaces the views
	// (undefined = render the views as usual; the admin source has no status, so it always does).
	const stateContent = resolveBoardState(status, visibleItems.length, states);
	const BulkBar = entity.BulkBar;

	return (
		<>
			{stateContent !== undefined ? stateContent : <BoardViewShell items={visibleItems} />}
			{canBulk && BulkBar && <BulkBar items={visibleItems} />}
		</>
	);
}

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { applyFilters } from "./filter/filter-config";
import { sortTasks } from "./filter/sort-config";
import { useBoardViewState } from "./filter/use-board-view-state";
import { usePersonalViews } from "./saved-views/use-personal-views";
import { BoardViewShell } from "./views/board-view-shell";

interface BoardProps {
	tasks: schema.TaskWithLabels[];
}

/**
 * Top-level assembled board component. Applies the filter/sort/completed-
 * visibility state before handing tasks down to BoardViewShell. The
 * FilterBuilder/QuickFilterChips controls that drive this state live in the
 * page's own PageHeader.Toolbar (see pages/admin/home/index.tsx), matching
 * every other admin page's TaskFilterDropdown-in-PageHeader.Toolbar
 * pattern — not mounted inside Board itself, which only ever receives
 * `tasks` and has no page-chrome opinions.
 *
 * A task hidden by `showCompletedTasks=false` or an active filter condition
 * can still surface as a subtask under a visible parent (or get promoted to
 * top-level if its own parent got filtered out) — see
 * config/groupings.ts's getTopLevelTasks/buildSubtaskMap, which already
 * fall back correctly since they only ever look at whatever task list they
 * receive, not the full unfiltered set.
 */
export function Board({ tasks }: BoardProps) {
	const { personalViews } = usePersonalViews();
	const { filters, showCompletedTasks, sortBy, sortDirection } = useBoardViewState(personalViews);

	const visibleTasks = useMemo(() => {
		const filtered = applyFilters(tasks, filters);
		const scoped = showCompletedTasks
			? filtered
			: filtered.filter((task) => task.status !== "done" && task.status !== "canceled");
		return sortBy !== "none" ? sortTasks(scoped, sortBy, sortDirection) : scoped;
	}, [tasks, filters, showCompletedTasks, sortBy, sortDirection]);

	return <BoardViewShell tasks={visibleTasks} />;
}

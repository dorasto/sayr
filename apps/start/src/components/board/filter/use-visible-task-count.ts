"use client";

import { useMemo } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { applyFilters } from "./filter-config";
import { useBoardViewState } from "./use-board-view-state";

/**
 * The same visible-task computation Board itself applies (filters + the completed-tasks
 * toggle) minus sorting, which doesn't affect a count — a single shared source so a
 * page-level "N tasks" label can never drift from what the board actually shows.
 */
export function useVisibleTaskCount(): number {
	const { tasks } = useLanderData();
	const { filters, showCompletedTasks } = useBoardViewState();

	return useMemo(() => {
		const filtered = applyFilters(tasks, filters);
		const scoped = showCompletedTasks
			? filtered
			: filtered.filter((task) => task.status !== "done" && task.status !== "canceled");
		return scoped.length;
	}, [tasks, filters, showCompletedTasks]);
}

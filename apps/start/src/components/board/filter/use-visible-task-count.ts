"use client";

import { useMemo } from "react";
import { useBoardEntity, useBoardItemsData } from "../core/board-data";
import { filterEntityItems, scopeCompletedItems } from "../core/entity";
import { useBoardViewState } from "./use-board-view-state";

/**
 * The same visible-item computation Board itself applies (filters + the completed toggle, per the board's
 * entity) minus sorting, which doesn't affect a count — a single shared source so a page-level "N tasks"
 * label can never drift from what the board actually shows.
 */
export function useVisibleTaskCount(): number {
	const { items } = useBoardItemsData();
	const entity = useBoardEntity();
	const { filters, showCompletedTasks } = useBoardViewState();

	return useMemo(
		() => scopeCompletedItems(entity, filterEntityItems(entity, items, filters), showCompletedTasks).length,
		[entity, items, filters, showCompletedTasks]
	);
}

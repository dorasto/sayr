"use client";

import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback, useMemo } from "react";

interface TaskSelectionState {
	selectedIds: string[];
}

const defaultState: TaskSelectionState = { selectedIds: [] };

/**
 * Global task selection state using TanStack Query cache.
 * Shared between PageHeader (select-all checkbox) and UnifiedTaskView (bulk action bar).
 *
 * @param filteredTaskIds - The current set of visible/filtered task IDs (for select-all logic)
 */
export function useTaskSelection(filteredTaskIds?: string[]) {
	const { value, setValue } = useStateManagement<TaskSelectionState>(
		"task-selection",
		defaultState,
	);

	const selectedSet = useMemo(
		() => new Set(value.selectedIds),
		[value.selectedIds],
	);

	const selectedCount = selectedSet.size;

	const isSelected = useCallback(
		(taskId: string) => selectedSet.has(taskId),
		[selectedSet],
	);

	const toggleTask = useCallback(
		(taskId: string, selected: boolean) => {
			const next = new Set(selectedSet);
			if (selected) {
				next.add(taskId);
			} else {
				next.delete(taskId);
			}
			setValue({ selectedIds: Array.from(next) });
		},
		[selectedSet, setValue],
	);

	const selectAll = useCallback(
		(ids: string[]) => {
			setValue({ selectedIds: ids });
		},
		[setValue],
	);

	const deselectAll = useCallback(() => {
		setValue({ selectedIds: [] });
	}, [setValue]);

	const isAllSelected = useMemo(() => {
		if (!filteredTaskIds || filteredTaskIds.length === 0) return false;
		return filteredTaskIds.every((id) => selectedSet.has(id));
	}, [filteredTaskIds, selectedSet]);

	const isIndeterminate = useMemo(() => {
		if (!filteredTaskIds || filteredTaskIds.length === 0) return false;
		const someSelected = filteredTaskIds.some((id) => selectedSet.has(id));
		return someSelected && !isAllSelected;
	}, [filteredTaskIds, selectedSet, isAllSelected]);

	return {
		selectedIds: value.selectedIds,
		selectedSet,
		selectedCount,
		isSelected,
		toggleTask,
		selectAll,
		deselectAll,
		isAllSelected,
		isIndeterminate,
	};
}

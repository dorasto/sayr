"use client";

import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import type { TaskGroupingId, TaskViewState } from "./types";
import { DEFAULT_TASK_VIEW_STATE, TASK_VIEW_STATE_KEY } from "./types";

export function useTaskViewState() {
	const { value, setValue } = useStateManagement<TaskViewState>(TASK_VIEW_STATE_KEY, DEFAULT_TASK_VIEW_STATE, 1);

	const viewState = value ?? DEFAULT_TASK_VIEW_STATE;

	const updateViewState = (next: Partial<TaskViewState> | ((prev: TaskViewState) => TaskViewState)) => {
		setValue(
			typeof next === "function"
				? (next as (prev: TaskViewState) => TaskViewState)(viewState)
				: { ...viewState, ...next }
		);
	};

	const setGrouping = (grouping: TaskGroupingId) => {
		updateViewState({ grouping });
	};

	const setShowEmptyGroups = (showEmptyGroups: boolean) => {
		updateViewState({ showEmptyGroups });
	};

	return {
		viewState,
		setViewState: updateViewState,
		setGrouping,
		setShowEmptyGroups,
	};
}

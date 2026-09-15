import type { schema } from "@repo/database";
import { useEffect } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import type { PriorityValue, StatusValue } from "../config/field-config";
import { type BoardGroupingOptions, NO_RELEASE_GROUP_ID, UNCATEGORIZED_GROUP_ID } from "../config/groupings";
import { useBoardTaskFieldAction } from "../fields/use-board-task-field-action";
import type { TaskGroupingId } from "../filter/types";

type DragUpdateData = {
	status?: StatusValue;
	priority?: PriorityValue;
	category?: string | null;
	releaseId?: string | null;
};

export interface BoardDragMutation {
	task: schema.TaskWithLabels;
	grouping: TaskGroupingId;
	groupId: string;
	subGrouping: TaskGroupingId | "none";
	subGroupId?: string;
}

function getGroupUpdate(
	task: schema.TaskWithLabels,
	groupBy: TaskGroupingId,
	groupId: string,
	{ categories, releases }: Required<BoardGroupingOptions>
): DragUpdateData | null {
	switch (groupBy) {
		case "status":
			return task.status === groupId ? null : { status: groupId as StatusValue };
		case "priority":
			return task.priority === groupId ? null : { priority: groupId as PriorityValue };
		case "category": {
			if (groupId === UNCATEGORIZED_GROUP_ID) {
				return task.category ? { category: null } : null;
			}
			const category = categories.find((item) => item.id === groupId);
			return category && category.organizationId === task.organizationId && task.category !== category.id
				? { category: category.id }
				: null;
		}
		case "release": {
			if (groupId === NO_RELEASE_GROUP_ID) {
				return task.releaseId ? { releaseId: null } : null;
			}
			const release = releases.find((item) => item.id === groupId);
			return release && release.organizationId === task.organizationId && task.releaseId !== release.id
				? { releaseId: release.id }
				: null;
		}
		case "assignee":
			// A task can appear in several assignee buckets. Dragging cannot express whether
			// existing assignees should be retained, so assignee regrouping intentionally no-ops.
			return null;
		case "org":
			// A task's organization isn't a mutable field — dragging between org
			// groups can't reassign it, so org regrouping intentionally no-ops.
			return null;
	}
}

function getDragUpdate(mutation: BoardDragMutation, options: Required<BoardGroupingOptions>): DragUpdateData | null {
	const primaryUpdate = getGroupUpdate(mutation.task, mutation.grouping, mutation.groupId, options);
	const subGroupUpdate =
		mutation.subGrouping !== "none" && mutation.subGroupId
			? getGroupUpdate(mutation.task, mutation.subGrouping, mutation.subGroupId, options)
			: null;
	const update = { ...primaryUpdate, ...subGroupUpdate };

	return Object.keys(update).length > 0 ? update : null;
}

interface BoardDragMutationExecutorProps {
	mutation: BoardDragMutation;
	onHandled: () => void;
}

/** Executes a drop mutation through the board's normal optimistic field action. */
export function BoardDragMutationExecutor({ mutation, onHandled }: BoardDragMutationExecutorProps) {
	const { categories, releases } = useLanderData();
	const { execute } = useBoardTaskFieldAction(mutation.task);

	useEffect(() => {
		const updateData = getDragUpdate(mutation, { categories, releases });
		if (updateData) {
			void execute({
				kind: "single",
				field: "grouping",
				updateData,
				optimisticTask: { ...mutation.task, ...updateData },
				toastMessages: {
					loading: { title: "Updating task grouping..." },
					success: { title: "Task grouping updated" },
					error: { title: "Failed to update task grouping" },
				},
			});
		}
		onHandled();
	}, [categories, execute, mutation, onHandled, releases]);

	return null;
}

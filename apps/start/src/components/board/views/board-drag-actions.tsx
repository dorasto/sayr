import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useEffect, useRef } from "react";
import {
	type BoardGroupingContext,
	type GroupingRegistry,
	NONE_GROUPING_ID,
	resolveEffectiveSubGrouping,
	resolveGroupingDefinition,
} from "../config/grouping-registry";
import { useBoardData, useBoardGroupings, useBoardItemActions, useFieldPermissionsResolver } from "../core/board-data";
import { getForbiddenPatchFields } from "../core/field-permissions";
import { useBoardViewState } from "../filter/use-board-view-state";

export interface BoardDragMutation {
	task: schema.TaskWithLabels;
	/** A registered grouping id (a built-in TaskGroupingId, or a page-supplied one). */
	grouping: string;
	groupId: string;
	/** A registered grouping id, or "none". */
	subGrouping: string;
	subGroupId?: string;
}

/**
 * What a drop writes: the primary grouping's patch merged with the sub-grouping's. Each grouping owns its own
 * `getDropPatch`; one without it (assignee, org, none) is a no-op — see config/groupings.tsx for why.
 */
function getDragUpdate(
	mutation: BoardDragMutation,
	registry: GroupingRegistry,
	ctx: BoardGroupingContext
): Record<string, unknown> | null {
	const effectiveSubGrouping = resolveEffectiveSubGrouping(registry, mutation.grouping, mutation.subGrouping);
	const primaryUpdate = resolveGroupingDefinition(registry, mutation.grouping).getDropPatch?.(
		mutation.task,
		mutation.groupId,
		ctx
	);
	const subGroupUpdate =
		effectiveSubGrouping !== NONE_GROUPING_ID && mutation.subGroupId
			? resolveGroupingDefinition(registry, effectiveSubGrouping).getDropPatch?.(
					mutation.task,
					mutation.subGroupId,
					ctx
				)
			: null;
	const update = { ...primaryUpdate, ...subGroupUpdate };

	return Object.keys(update).length > 0 ? update : null;
}

interface BoardDragMutationExecutorProps {
	mutation: BoardDragMutation;
	onHandled: () => void;
}

/**
 * Executes a drop mutation through the board's normal optimistic field action. A drop that would change a
 * field the viewer may not edit on that task (core/field-permissions.ts) is refused here, with a toast,
 * instead of being sent for the server to reject after an optimistic move.
 */
export function BoardDragMutationExecutor({ mutation, onHandled }: BoardDragMutationExecutorProps) {
	const data = useBoardData();
	const groupings = useBoardGroupings();
	const { showCompletedTasks } = useBoardViewState();
	const { execute } = useBoardItemActions(mutation.task);
	const resolvePermissions = useFieldPermissionsResolver();
	// Read at drop time, not a dependency: the optimistic write below changes `data`, and that must not re-run this effect.
	const dataRef = useRef(data);
	dataRef.current = data;
	const resolvePermissionsRef = useRef(resolvePermissions);
	resolvePermissionsRef.current = resolvePermissions;

	useEffect(() => {
		const updateData = getDragUpdate(mutation, groupings, {
			data: dataRef.current,
			showCompletedTasks,
			partial: dataRef.current.pagination?.hasMore ?? false,
			now: new Date(),
		});
		const forbidden = updateData
			? getForbiddenPatchFields(updateData, resolvePermissionsRef.current(mutation.task))
			: [];
		if (forbidden.length > 0) {
			headlessToast.error({
				title: "Can't move this task",
				description: `You don't have permission to change its ${forbidden.join(" and ")}.`,
			});
		} else if (updateData) {
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
	}, [execute, groupings, mutation, onHandled, showCompletedTasks]);

	return null;
}

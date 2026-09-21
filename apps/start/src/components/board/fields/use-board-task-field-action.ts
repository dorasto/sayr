import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { replaceTask } from "@/lib/board/apply-lander-event";
import { useTaskFieldAction } from "../../tasks/actions/use-task-field-action";

export function useBoardTaskFieldAction(task: schema.TaskWithLabels) {
	const { tasks, updateTasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const taskId = task.id;

	// useTaskFieldAction reports every edit as "the whole list, with this one task
	// swapped", built from the list this row last rendered. Writing that list back
	// would undo anything an SSE event changed since that render — so pick out the
	// one task this hook owns and apply just that, as an update of the LATEST store
	// value. replaceTask also reattaches the row's cross-org `.organization`,
	// which the generic update endpoint's response doesn't carry (getLanderData
	// and the SSE hook attach it themselves); a task's org never changes from a
	// field edit.
	const applyUpdatedTask = useCallback(
		(updated: schema.TaskWithLabels[]) => {
			const next = updated.find((candidate) => candidate.id === taskId);
			if (next) updateTasks((prev) => replaceTask(prev, next));
		},
		[updateTasks, taskId]
	);

	return useTaskFieldAction(task, tasks, () => undefined, applyUpdatedTask, sseClientId);
}

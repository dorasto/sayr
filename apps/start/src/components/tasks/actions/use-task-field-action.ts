import type { schema } from "@repo/database";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useCallback } from "react";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { FieldUpdatePayload } from "./types";

/**
 * Shared hook that executes any FieldUpdatePayload.
 *
 * Handles optimistic updates to both the single-task and task-list contexts,
 * fires the appropriate API call via `runWithToast`, and reconciles the
 * response back into state + triggers timeline refresh.
 *
 * This is the single place where task field update side-effects live.
 * Action definition files produce *payloads*; this hook *executes* them.
 */
export function useTaskFieldAction(
	task: schema.TaskWithLabels,
	tasks: schema.TaskWithLabels[],
	setTask: (t: schema.TaskWithLabels | null) => void,
	setTasks: (t: schema.TaskWithLabels[]) => void,
	wsClientId: string,
) {
	const { runWithToast } = useToastAction();

	const execute = useCallback(
		async (payload: FieldUpdatePayload, options?: { skipOptimistic?: boolean }) => {
			const skipOptimistic = options?.skipOptimistic ?? false;

			switch (payload.kind) {
				case "single": {
					if (!skipOptimistic) {
						setTask(payload.optimisticTask);
						setTasks(tasks.map((t) => (t.id === task.id ? payload.optimisticTask : t)));
					}

					const data = await runWithToast(
						`update-task-${payload.field}`,
						payload.toastMessages,
						() => updateTaskAction(task.organizationId, task.id, payload.updateData, wsClientId),
					);

					if (data?.success && data.data) {
						setTask(data.data);
						setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
						sendWindowMessage(window, { type: "timeline-update", payload: data.data.id }, "*");
					}
					break;
				}

				case "multi": {
					if (!skipOptimistic) {
						setTask(payload.optimisticTask);
						setTasks(tasks.map((t) => (t.id === task.id ? payload.optimisticTask : t)));
					}

					const multiData = await runWithToast(
						payload.actionId,
						payload.toastMessages,
						payload.apiFn,
					);

					if (multiData?.success && multiData.data) {
						setTask(multiData.data);
						setTasks(tasks.map((t) => (t.id === task.id && multiData.data ? multiData.data : t)));
						sendWindowMessage(window, { type: "timeline-update", payload: multiData.data.id }, "*");
					}
					break;
				}

				case "parent": {
					if (!skipOptimistic) {
						setTask(payload.optimisticTask);
						setTasks(tasks.map((t) => (t.id === task.id ? payload.optimisticTask : t)));
					}

					const parentData = await runWithToast(
						payload.actionId,
						payload.toastMessages,
						payload.apiFn,
					);

					if (parentData?.success && parentData.data) {
						setTask(parentData.data);
						setTasks(tasks.map((t) => (t.id === task.id && parentData.data ? parentData.data : t)));
						sendWindowMessage(window, { type: "timeline-update", payload: parentData.data.id }, "*");
					}
					break;
				}

				case "relation": {
					// No optimistic update for relations (they're separate entities)
					const relData = await runWithToast(
						payload.actionId,
						payload.toastMessages,
						payload.apiFn,
					);

					if (relData?.success) {
						sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
					}
					break;
				}
			}
		},
		[task, tasks, setTask, setTasks, wsClientId, runWithToast],
	);

	return { execute };
}

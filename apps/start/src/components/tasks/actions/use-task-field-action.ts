import type { schema } from "@repo/database";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useCallback, useEffect, useRef } from "react";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { FieldUpdatePayload, MultiFieldUpdatePayload } from "./types";

/**
 * Auto-debounce delay (ms) for `multi` payloads (labels, assignees).
 * The optimistic update is applied immediately; only the API call is debounced.
 */
const MULTI_DEBOUNCE_MS = 1500;

interface PendingMulti {
	timer: ReturnType<typeof setTimeout>;
	payload: MultiFieldUpdatePayload;
}

/**
 * Shared hook that executes any FieldUpdatePayload.
 *
 * Handles optimistic updates to both the single-task and task-list contexts,
 * fires the appropriate API call via `runWithToast`, and reconciles the
 * response back into state + triggers timeline refresh.
 *
 * For `multi` payloads (labels, assignees), the optimistic update is applied
 * immediately and the API call is auto-debounced by `actionId` (1500 ms).
 * Rapid toggling of checkboxes batches into a single API call.
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

	// Map of pending debounced multi-field API calls, keyed by actionId.
	const pendingRef = useRef<Map<string, PendingMulti>>(new Map());

	// Keep latest task/tasks in refs so the debounced callback always
	// sees current state without needing to re-create the timer.
	const taskRef = useRef(task);
	taskRef.current = task;
	const tasksRef = useRef(tasks);
	tasksRef.current = tasks;

	// Clean up pending timers on unmount.
	useEffect(() => {
		return () => {
			for (const pending of pendingRef.current.values()) {
				clearTimeout(pending.timer);
			}
			pendingRef.current.clear();
		};
	}, []);

	/**
	 * Reconcile an API response into state and trigger a timeline refresh.
	 */
	const reconcile = useCallback(
		(data: schema.TaskWithLabels) => {
			setTask(data);
			setTasks(tasksRef.current.map((t) => (t.id === data.id ? data : t)));
			sendWindowMessage(window, { type: "timeline-update", payload: data.id }, "*");
		},
		[setTask, setTasks],
	);

	const execute = useCallback(
		async (payload: FieldUpdatePayload) => {
			switch (payload.kind) {
				case "single": {
					// Immediate optimistic update + API call (no debounce needed for single-select).
					setTask(payload.optimisticTask);
					setTasks(tasksRef.current.map((t) => (t.id === taskRef.current.id ? payload.optimisticTask : t)));

					const data = await runWithToast(
						`update-task-${payload.field}`,
						payload.toastMessages,
						() => updateTaskAction(taskRef.current.organizationId, taskRef.current.id, payload.updateData, wsClientId),
					);

					if (data?.success && data.data) {
						reconcile(data.data);
					}
					break;
				}

				case "multi": {
					// Immediate optimistic update.
					setTask(payload.optimisticTask);
					setTasks(tasksRef.current.map((t) => (t.id === taskRef.current.id ? payload.optimisticTask : t)));

					// Debounce the API call by actionId — if the user is rapidly toggling
					// checkboxes, only the last payload fires.
					const existing = pendingRef.current.get(payload.actionId);
					if (existing) {
						clearTimeout(existing.timer);
					}

					const timer = setTimeout(async () => {
						pendingRef.current.delete(payload.actionId);

						const multiData = await runWithToast(
							payload.actionId,
							payload.toastMessages,
							payload.apiFn,
						);

						if (multiData?.success && multiData.data) {
							reconcile(multiData.data);
						}
					}, MULTI_DEBOUNCE_MS);

					pendingRef.current.set(payload.actionId, { timer, payload });
					break;
				}

				case "parent": {
					setTask(payload.optimisticTask);
					setTasks(tasksRef.current.map((t) => (t.id === taskRef.current.id ? payload.optimisticTask : t)));

					const parentData = await runWithToast(
						payload.actionId,
						payload.toastMessages,
						payload.apiFn,
					);

					if (parentData?.success && parentData.data) {
						reconcile(parentData.data);
					}
					break;
				}

				case "relation": {
					// No optimistic update for relations (they're separate entities).
					const relData = await runWithToast(
						payload.actionId,
						payload.toastMessages,
						payload.apiFn,
					);

					if (relData?.success) {
						sendWindowMessage(window, { type: "timeline-update", payload: taskRef.current.id }, "*");
					}
					break;
				}
			}
		},
		[setTask, setTasks, wsClientId, runWithToast, reconcile],
	);

	return { execute };
}

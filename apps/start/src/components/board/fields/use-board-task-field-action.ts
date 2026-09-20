import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { useTaskFieldAction } from "../../tasks/actions/use-task-field-action";

export function useBoardTaskFieldAction(task: schema.TaskWithLabels) {
	const { tasks, setTasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const organization = task.organization;

	// The generic task-update endpoint returns the task as-is, without the
	// board's client-side cross-org enrichment (getLanderData attaches
	// `.organization` after loading, since the update endpoint has no reason
	// to know about it) — so reconciling with that raw response strips the
	// org badge/shortId off the row until the next full page load. A task's
	// org never changes from a field edit, so just reattach the one we
	// already had.
	const setTasksPreservingOrg = useCallback(
		(updated: schema.TaskWithLabels[]) => {
			setTasks(
				updated.map((t) => (t.id === task.id && !t.organization && organization ? { ...t, organization } : t))
			);
		},
		[setTasks, task.id, organization]
	);

	return useTaskFieldAction(task, tasks, () => undefined, setTasksPreservingOrg, sseClientId);
}

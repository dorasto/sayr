import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useLanderData } from "@/contexts/ContextLander";
import { useTaskFieldAction } from "../../tasks/actions/use-task-field-action";

export function useBoardTaskFieldAction(task: schema.TaskWithLabels) {
	const { tasks, setTasks } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	return useTaskFieldAction(task, tasks, () => undefined, setTasks, sseClientId);
}

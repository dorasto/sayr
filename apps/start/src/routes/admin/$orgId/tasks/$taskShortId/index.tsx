import { createFileRoute } from "@tanstack/react-router";
import { TaskContentMain } from "@/components/tasks/task/task-content";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useLayoutData } from "@/components/generic/Context";
import { useWSMessageHandler,type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId/")({
	component: RouteComponent,
});

function RouteComponent() {
		const { ws } = useLayoutData();
	const { tasks, setTasks } = useLayoutTasks();
	const { task, setTask } = useLayoutTask();
	const { organization,setOrganization, labels, categories ,setLabels,setViews,setCategories} = useLayoutOrganization();

	const availableUsers =
		organization?.members.map((member) => member.user) || [];
			useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `task:${task.id}`,
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setLabels(msg.data);
			}
		},
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setViews(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setCategories(msg.data);
			}
		},
		UPDATE_TASK: (msg) => {
			const updatedTask = msg.data;
			const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
			setTasks(updatedTasks);
			if (task && task.id === updatedTask.id) {
				setTask({ ...task, ...updatedTask });
				sendWindowMessage(
					window,
					{
						type: "timeline-update",
						payload: updatedTask.id,
					},
					"*"
				);
			}
		},
		UPDATE_TASK_COMMENTS: async (msg) => {
			if (msg.data.id === task.id) {
				sendWindowMessage(
					window,
					{
						type: "timeline-update-comment",
						payload: msg.data.id,
					},
					"*"
				);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE OrganizationProjectTaskHomePage]", { msg }),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	return (
		<TaskContentMain
			task={task}
			labels={labels}
			availableUsers={availableUsers}
			organization={organization}
			categories={categories}
		/>
	);
}

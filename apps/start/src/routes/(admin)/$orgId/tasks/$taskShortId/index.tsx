import { createFileRoute } from "@tanstack/react-router";
import { TaskContentMain } from "@/components/tasks/task/task-content";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutData } from "@/components/generic/Context";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect } from "react";
import { markNotificationsReadByTaskAction } from "@/lib/fetches/notification";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import type { ServerEventMessage } from "@/lib/serverEvents";

export const Route = createFileRoute("/(admin)/$orgId/tasks/$taskShortId/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { serverEvents } = useLayoutData();
	const { tasks, setTasks } = useLayoutTasks();
	const { task, setTask } = useLayoutTask();
	const { organization, setOrganization, labels, categories, releases, setLabels, setViews, setCategories } =
		useLayoutOrganization();

	const availableUsers = organization?.members.map((member) => member.user) || [];
	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization: organization,
		channel: `task:${task.id}`,
		setOrganization: setOrganization,
	});

	// Mark any unread notifications for this task as read when the user views it directly
	useEffect(() => {
		if (task.id) {
			markNotificationsReadByTaskAction(task.id);
		}
	}, [task.id]);

	const handlers: WSMessageHandler<ServerEventMessage> = {
		CREATE_TASK: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setTasks([...tasks, msg.data]);
			}
		},
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
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE OrganizationProjectTaskHomePage]", { msg }),
	});
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);
	return (
		<TaskContentMain
			task={task}
			tasks={tasks}
			setTasks={setTasks}
			setTask={setTask}
			labels={labels}
			availableUsers={availableUsers}
			organization={organization}
			categories={categories}
			releases={releases}
		/>
	);
}

"use client";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect } from "react";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutTask } from "@/app/admin/[organization_id]/tasks/[task_short_id]/Context";
import { useLayoutTasks } from "@/app/admin/[organization_id]/tasks/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import { TaskContent } from "./views/table/task-content";

export default function OrganizationTaskHomePage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, labels, setLabels, views, setViews, categories, setCategories } =
		useLayoutOrganization();
	const { tasks, setTasks } = useLayoutTasks();
	const { task, setTask } = useLayoutTask();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `task:${task.id}`,
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		CREATE_LABEL: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setLabels([...labels, msg.data]);
			}
		},
		CREATE_VIEW: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setViews([...views, msg.data]);
			}
		},
		CREATE_CATEGORY: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setCategories([...categories, msg.data]);
			}
		},
		EDIT_CATEGORY: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setCategories(categories.map((cat) => (cat.id === msg.data.id ? { ...cat, ...msg.data } : cat)));
			}
		},
		REMOVE_CATEGORY: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setCategories(categories.filter((cat) => cat.id !== msg.data?.id));
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
						type: "timeline-update",
						payload: msg.data.id,
					},
					"*"
				);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE OrganizationProjectTaskHomePage]", msg),
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
		<TaskContent
			task={task}
			open={true}
			labels={labels}
			tasks={tasks}
			setTasks={setTasks}
			setSelectedTask={(task) => {
				if (task) setTask(task);
			}}
			onOpenChange={(): void => {
				throw new Error("Function not implemented.");
			}}
			organization={organization}
			availableUsers={organization.members.map((member) => member.user)}
			isDialog={false}
			ws={ws}
			categories={categories}
		/>
	);
}

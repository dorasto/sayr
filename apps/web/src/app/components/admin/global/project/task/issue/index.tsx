"use client";
import { useEffect } from "react";
import { useLayoutProject } from "@/app/admin/[organization_id]/[project_id]/Context";
import { useLayoutProjectTask } from "@/app/admin/[organization_id]/[project_id]/task/[task_short_id]/Context";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import { TaskContent } from "../table/task-content";

export default function OrganizationProjectTaskHomePage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, labels, setLabels } = useLayoutOrganization();
	const { project, tasks, setTasks } = useLayoutProject();
	const { task, setTask } = useLayoutProjectTask();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `project-${project.id}-task-${task.id}`,
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		CREATE_LABEL: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.organizationId === organization.id) {
				setLabels([...labels, msg.data]);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE]", msg),
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
			onOpenChange={(open: boolean): void => {
				throw new Error("Function not implemented.");
			}}
			organization={organization}
			project={project}
			availableUsers={organization.members.map((member) => member.user)}
			isDialog={false}
		/>
	);
}

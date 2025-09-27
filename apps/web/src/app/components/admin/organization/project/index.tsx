"use client";
import { Label } from "@repo/ui/components/label";
import { useEffect } from "react";
import { useLayoutProject } from "@/app/admin/[organization_id]/[project_id]/Context";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import ListProjectTasks from "./list";

export default function OrganizationProjectHomePage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, labels, setLabels } = useLayoutOrganization();
	const { project, tasks, setTasks } = useLayoutProject();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `project-${project.id}`,
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		CREATE_TASK: (msg) => {
			setTasks([...tasks, msg.data]);
		},
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
		<div className="relative flex flex-col gap-3 h-full max-h-full">
			{/* <div className="flex items-center gap-3 bg-card rounded p-3 w-full">
				<Label variant={"heading"} className="truncate w-auto">
					{project.name}
				</Label>
			</div> */}
			<div className="flex-1 overflow-scroll pb-4">
				<ListProjectTasks
					tasks={tasks}
					setTasks={setTasks}
					ws={ws}
					labels={labels}
					availableUsers={organization.members.map((member) => member.user)}
					organization={organization}
					project={project}
				/>
			</div>
		</div>
	);
}

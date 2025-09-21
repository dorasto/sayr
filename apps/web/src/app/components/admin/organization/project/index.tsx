"use client";
import { Label } from "@repo/ui/components/label";
import { useEffect } from "react";
import { useLayoutProject } from "@/app/admin/[organization_id]/[project_id]/Context";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import ListProjectIssues from "./list";
import { ProjectDropdown } from "./project-dropdown";

export default function OrganizationProjectHomePage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization } = useLayoutOrganization();
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
		<div className="relative flex flex-col gap-6">
			<div className="flex items-center gap-3 bg-card rounded p-3">
				<Label variant={"heading"}>{project.name}</Label>
				<ProjectDropdown />
			</div>
			<ListProjectIssues tasks={tasks} setTasks={setTasks} ws={ws} />
		</div>
	);
}

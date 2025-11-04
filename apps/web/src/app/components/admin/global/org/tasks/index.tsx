"use client";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@repo/ui/components/resizable";
import { Separator } from "@repo/ui/components/separator";
import { useEffect } from "react";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutTasks } from "@/app/admin/[organization_id]/tasks/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import ProjectSide from "../shared/ProjectSide";
import ListTasks from "./list";
import { TaskFilterDropdown } from "./task/filter/dropdown/TaskFilterDropdown";
import { TaskViewDropdown } from "./task/grouping/task-view-dropdown";

export default function OrganizationTasksHomePage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, labels, setLabels, views, setViews, categories, setCategories } =
		useLayoutOrganization();
	const { tasks, setTasks } = useLayoutTasks();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: `tasks`,
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
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE PROJECT PAGE]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	const availableUsers = organization?.members.map((member) => member.user) || [];
	return (
		<div className="relative flex flex-col h-full max-h-full">
			{/* <div className="flex items-center gap-3 bg-card rounded p-3 w-full">
                <Label variant={"heading"} className="truncate w-auto">
                    {project.name}
                </Label>
            </div> */}
			<div className="sticky top-0 z-20 bg-background flex items-center gap-2 p-2">
				<TaskFilterDropdown
					tasks={tasks}
					labels={labels}
					availableUsers={availableUsers}
					organizationId={organization.id}
					views={views}
					setViews={setViews}
					categories={categories}
				/>
				<div className="flex items-center gap-2 shrink-0 ml-auto">
					<Separator orientation="vertical" className="h-5" />
					<TaskViewDropdown />
				</div>
			</div>
			<ResizablePanelGroup direction="horizontal">
				<ResizablePanel defaultSize={80} minSize={70}>
					<div className="flex-1 overflow-y-auto h-full flex flex-col relative px-2">
						<ListTasks
							tasks={tasks}
							setTasks={setTasks}
							ws={ws}
							labels={labels}
							availableUsers={organization.members.map((member) => member.user)}
							organization={organization}
							categories={categories}
						/>
					</div>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel defaultSize={20} minSize={10} collapsedSize={0} collapsible={true}>
					<div className="flex-1 overflow-y-auto h-full flex flex-col relative px-2">
						<ProjectSide />
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

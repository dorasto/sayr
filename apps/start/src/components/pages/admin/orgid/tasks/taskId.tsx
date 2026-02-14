import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	type ResizablePanelHandle,
} from "@repo/ui/components/resizable";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { TaskContentMobileContent, TaskContentSideContent } from "@/components/tasks/task/task-content";
import { PageHeader } from "@/components/generic/PageHeader";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { useToastAction } from "@/lib/util";
import { Button } from "@repo/ui/components/button";
import { IconLayoutSidebarRight, IconLayoutSidebarRightFilled, IconUsers } from "@tabler/icons-react";

export default function OrganizationTaskIdPage() {
	const useMobile = useIsMobile();
	const { task, setTask } = useLayoutTask();
	const { organization, labels, categories, releases } = useLayoutOrganization();
	const { tasks, setTasks } = useLayoutTasks();
	const { runWithToast } = useToastAction();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);

	// Set mentionContext so the Editor's useMentionUsers hook can fetch org members
	useEffect(() => {
		if (organization?.id) {
			setMentionContext({ orgId: organization.id });
		}
	}, [organization?.id, setMentionContext]);

	const availableUsers = organization?.members.map((member) => member.user) || [];

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
	const ref = useRef<ResizablePanelHandle>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(true);

	return (
		<div className="relative flex flex-col h-full max-h-full">
			<PageHeader>
				<PageHeader.Identity>
					<Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
						<Button
							variant={"primary"}
							className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
							size={"sm"}
						>
							<Avatar className="h-4 w-4">
								<AvatarImage
									src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
									alt={organization.name}
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<span>{organization.name}</span>
						</Button>
					</Link>
					<span className="text-muted-foreground text-xs">/</span>
					<span className="text-xs">#{task.shortId}</span>
				</PageHeader.Identity>
			</PageHeader>
			{useMobile ? (
				<div>
					<div className="sticky top-0 p-1 bg-sidebar border-b z-[99999999999999999]">
						{organization && (
							<TaskContentMobileContent
								task={task}
								labels={labels}
								tasks={tasks}
								setTasks={setTasks}
								setSelectedTask={(t) => t && setTask(t)}
								availableUsers={availableUsers}
								wsClientId={wsClientId}
								runWithToast={runWithToast}
								categories={categories}
								releases={releases}
								organization={organization}
							/>
						)}
					</div>
					<Outlet />
				</div>
			) : (
				<ResizablePanelGroup direction="horizontal" className="">
					<ResizablePanel defaultSize={useMobile ? 100 : 80} minSize={50}>
						<div className={cn("flex-1 overflow-y-auto h-full flex flex-col relative")}>
							<Outlet />
						</div>
					</ResizablePanel>
					<ResizableHandle className={cn(!isPanelOpen && "opacity-0")} />
					{!isPanelOpen && (
						<Button
							variant="primary"
							className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1 fixed right-2 top-2 z-50")}
							onClick={() => {
								if (isPanelOpen) {
									ref.current?.collapse();
								} else {
									ref.current?.expand();
								}
							}}
						>
							{isPanelOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
						</Button>
					)}
					<ResizablePanel
						defaultSize={20}
						minSize={10}
						maxSize={100}
						collapsible
						collapsedSize={0}
						ref={ref}
						onCollapse={() => setIsPanelOpen(false)}
						onExpand={() => setIsPanelOpen(true)}
						className=""
					>
						<div className="flex-1 overflow-y-auto h-full flex flex-col relative">
							{organization && (
								<TaskContentSideContent
									task={task}
									labels={labels}
									tasks={tasks}
									setTasks={setTasks}
									setSelectedTask={(t) => t && setTask(t)}
									availableUsers={availableUsers}
									wsClientId={wsClientId}
									runWithToast={runWithToast}
									categories={categories}
									releases={releases}
									organization={organization}
									panelControls={{
										isPanelOpen,
										onToggle: () => {
											if (isPanelOpen) {
												ref.current?.collapse();
											} else {
												ref.current?.expand();
											}
										},
									}}
								/>
							)}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</div>
	);
}

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { TaskContentMobileContent } from "@/components/tasks/task/task-content";
import { Page } from "@/components/generic/page";
import { PageHeader } from "@/components/generic/PageHeader";
import { usePage, usePanel } from "@/components/generic/use-page";
import { TaskPanelHeader, TaskPanelContent } from "@/components/admin/panels/task";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { Button } from "@repo/ui/components/button";
import { IconLayoutSidebarRight, IconLayoutSidebarRightFilled, IconLink, IconUsers } from "@tabler/icons-react";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";

const TASK_PANEL_ID = "task-detail-panel";

export default function OrganizationTaskIdPage() {
	const useMobile = useIsMobile();
	const { task, setTask } = useLayoutTask();
	const { organization, labels, categories, releases } = useLayoutOrganization();
	const { tasks, setTasks } = useLayoutTasks();
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const { setPanelContent, closePanel } = usePage();
	const panel = usePanel(TASK_PANEL_ID);

	// Set mentionContext so the Editor's useMentionUsers hook can fetch org members and task participants
	useEffect(() => {
		if (organization?.id) {
			setMentionContext({ orgId: organization.id, taskId: task.id });
		}
	}, [organization?.id, task.id, setMentionContext]);

	// TaskPanelContent pulls everything it needs from context itself, so it
	// only needs to be handed to the panel once — it stays in sync on its own.
	// Gated on isRegistered, not just mount: Page defers registering the
	// panel to its client-only pass, so a plain `[]`-effect here would race
	// it and silently no-op.
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(TASK_PANEL_ID, <TaskPanelContent />);
	}, [panel.isRegistered, setPanelContent]);

	// Mobile renders the task content inline (below) instead of through the
	// side panel — mirror the old PanelWrapper behavior of always closing the
	// panel on mobile so the two don't both try to show it at once.
	useEffect(() => {
		if (useMobile && panel.isOpen) closePanel(TASK_PANEL_ID);
	}, [useMobile, panel.isOpen, closePanel]);

	return (
		<Page
			panels={{
				right: {
					id: TASK_PANEL_ID,
					header: <TaskPanelHeader />,
					defaultOpen: true,
					width: "420px",
				},
			}}
			header={
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
					<div className="ml-auto flex items-center gap-2">
						{!panel.isOpen && (
							<SimpleClipboard
								textToCopy={`https://${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
								variant={"primary"}
								className="h-6 p-1 w-fit bg-transparent"
								copyIcon={<IconLink />}
								tooltipText="Copy task URL"
								tooltipSide="bottom"
							/>
						)}
						<Button
							variant="primary"
							className={cn(
								"gap-2 h-6 w-fit bg-accent border-transparent p-1",
								!panel.isOpen && "bg-transparent"
							)}
							onClick={() =>
								panel.isOpen ? closePanel(TASK_PANEL_ID) : sidebarActions.setOpen(TASK_PANEL_ID, true)
							}
						>
							{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
						</Button>
					</div>
				</PageHeader.Identity>
			}
		>
			{useMobile ? (
				<div>
					<div className="p-1 bg-sidebar border-b z-0">
						{organization && (
							<TaskContentMobileContent
								task={task}
								labels={labels}
								tasks={tasks}
								setTasks={setTasks}
								setSelectedTask={(t) => t && setTask(t)}
								availableUsers={organization.members.map((member) => member.user) || []}
								categories={categories}
								releases={releases}
								organization={organization}
							/>
						)}
					</div>
					<Outlet />
				</div>
			) : (
				<div className={cn("flex-1 overflow-y-auto h-full flex flex-col relative")}>
					<Outlet />
				</div>
			)}
		</Page>
	);
}

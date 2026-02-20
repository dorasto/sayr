"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
} from "@repo/ui/components/doras-ui/sidebar";
import { ensureCdnUrl } from "@repo/util";
import { formatDateTimeFromNow } from "@repo/util";
import {
	IconBrandGithub,
	IconCalendar,
	IconCalendarCheck,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useRegisterPanel } from "@/hooks/useRegisterPanel";
import { statusConfig, priorityConfig } from "@/components/tasks/shared/config";
import type { StatusKey, PriorityKey } from "@/components/tasks/shared/config";

/**
 * Fixed header for the task detail panel, height-matched to PageHeader.Identity (h-11).
 * Shows org avatar + task short ID and title.
 */
function TaskPanelHeader() {
	const { task } = useLayoutTask();
	const { organization } = useLayoutOrganization();

	return (
		<div className="flex items-center gap-2 w-full flex-1 min-w-0">
			<Avatar className="h-4 w-4 shrink-0">
				<AvatarImage
					src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
					alt={organization.name}
				/>
				<AvatarFallback className="rounded-md uppercase text-[10px]">
					<IconUsers className="h-3 w-3" />
				</AvatarFallback>
			</Avatar>
			<span className="text-xs font-medium truncate">
				#{task.shortId} {task.title || "Untitled"}
			</span>
		</div>
	);
}

/**
 * Hook that registers right panel content for the single task detail page.
 * Must be called inside RootProviderOrganizationTask context.
 */
export function useTaskPanel() {
	const { task } = useLayoutTask();

	const statusCfg = statusConfig[task.status as StatusKey];
	const priorityCfg = priorityConfig[(task.priority || "none") as PriorityKey];

	const registration = useMemo(
		() => ({
			header: <TaskPanelHeader />,
		sections: [
			{
				id: "task-status",
				title: "Details",
				priority: 10,
				content: (
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton icon={statusCfg.icon("size-4")}>
								<span className="flex-1">Status</span>
								<span className="text-xs text-muted-foreground">{statusCfg.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton icon={priorityCfg.icon("size-4")}>
								<span className="flex-1">Priority</span>
								<span className="text-xs text-muted-foreground">{priorityCfg.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						{task.createdBy && (
							<SidebarMenuItem>
								<SidebarMenuButton
									icon={
										task.createdBy.image ? (
											<Avatar className="h-4 w-4">
												<AvatarImage
													src={ensureCdnUrl(task.createdBy.image)}
													alt={task.createdBy.name}
												/>
												<AvatarFallback className="rounded-md text-[10px]">
													<IconUser className="h-3 w-3" />
												</AvatarFallback>
											</Avatar>
										) : (
											<IconUser className="size-4" />
										)
									}
								>
									<span className="flex-1">Created by</span>
									<span className="text-xs text-muted-foreground truncate max-w-[100px]">
										{task.createdBy.displayName || task.createdBy.name}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)}
					</SidebarMenu>
				),
			},
			{
				id: "task-dates",
				title: "Dates",
				priority: 20,
				content: (
					<SidebarMenu>
						{task.createdAt && (
							<SidebarMenuItem>
								<SidebarMenuButton icon={<IconCalendar className="size-4" />}>
									<span className="flex-1">Created</span>
									<span className="text-xs text-muted-foreground">
										{formatDateTimeFromNow(task.createdAt)}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)}
						{task.updatedAt && (
							<SidebarMenuItem>
								<SidebarMenuButton icon={<IconCalendarCheck className="size-4" />}>
									<span className="flex-1">Updated</span>
									<span className="text-xs text-muted-foreground">
										{formatDateTimeFromNow(task.updatedAt)}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)}
					</SidebarMenu>
				),
			},
			...(task.githubIssue
				? [
						{
							id: "task-github",
							title: "GitHub",
							priority: 30,
							content: (
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											icon={<IconBrandGithub className="size-4" />}
											asChild
										>
											<a
												href={task.githubIssue.issueUrl || "#"}
												target="_blank"
												rel="noopener noreferrer"
											>
												<span className="flex-1 truncate">
													#{task.githubIssue.issueNumber}
												</span>
												<span className="text-xs text-muted-foreground">
													View
												</span>
											</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							),
						},
					]
				: []),
		],
		}),
		[
			task.createdBy,
			task.createdAt,
			task.updatedAt,
			task.githubIssue,
			statusCfg,
			priorityCfg,
		],
	);

	useRegisterPanel("task-panel", registration);
}

/**
 * Null-rendering registrar component. Mount in the task detail route layout
 * to register right panel content for the single task page.
 */
export function TaskPanelRegistrar() {
	useTaskPanel();
	return null;
}

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { SidebarGroup, SidebarMenuButton, SidebarMenuItem } from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
	IconChevronRight,
	IconProgress,
	IconRocket,
	IconSettings,
	IconSparkles,
	IconStack2,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

// import UpdateOrgDialog from "@/app/components/admin/global/org/management/update/edit-org-dialog"; // TODO: Port this
// import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog"; // TODO: Port this

interface OrgSectionProps {
	organization: schema.OrganizationWithMembers;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
	const [collapsibleOpen, setCollapsibleOpen] = useState(pathname.includes(`/${organization.id}`));
	const closeMobileSidebarOnClick = () => {
		if (isMobile) {
			closeMobileSidebar();
		}
	};

	// Organization row with its full nested navigation.
	const renderCollapsibleView = () => (
		<>
			<Collapsible
				key={organization.id}
				open={collapsibleOpen}
				onOpenChange={setCollapsibleOpen}
				className={cn("group/collapsible flex flex-col gap-0.5")}
			>
				<SidebarMenuItem
					// key={item.title}
					isActive={pathname === `/${organization.id}`}
					className="min-h-auto group/coltrig"
				>
					<CollapsibleTrigger
						render={
							<button
								type="button"
								className="group/trigger relative flex size-6 shrink-0 items-center justify-center rounded-md"
								aria-label={`Toggle ${organization.name}`}
							>
								<IconChevronRight
									className={cn(
										"absolute inset-0 size-4 m-auto bg-transparent text-transparent transition-transform duration-200 group-hover/coltrig:bg-sidebar-accent group-hover/coltrig:text-sidebar-foreground",
										collapsibleOpen && "rotate-90"
									)}
								/>
								<Avatar className="size-4 rounded-md bg-accent transition-none group-hover/coltrig:size-0">
									<AvatarImage src={organization.logo || ""} alt={organization.name} />
									<AvatarFallback className="rounded-md text-xs uppercase">
										<IconUsers className="size-4" />
									</AvatarFallback>
								</Avatar>
							</button>
						}
					/>
					<Link
						to={`/$orgId`}
						params={{ orgId: organization.id }}
						className="min-w-0 flex-1 cursor-pointer"
						onClick={() => {
							setCollapsibleOpen(true);
							closeMobileSidebarOnClick();
						}}
					>
						<SidebarMenuButton size="small" className="w-full">
							<span className="w-full flex flex-row items-center gap-3">
								{organization.name}{" "}
								<span className="">
									{organization.plan === "pro" && <IconSparkles className="size-4 text-primary" />}
								</span>
							</span>
						</SidebarMenuButton>
					</Link>
				</SidebarMenuItem>
				<SidebarGroup className={cn("")}>
					<CollapsibleContent className="flex flex-col gap-0.5 ml-2 pl-2 border-l">
						<SidebarMenuItem
							className="cursor-pointer min-h-auto"
							isActive={pathname.includes(`/${organization.id}/tasks`)}
						>
							<Link to={`/$orgId/tasks`} params={{ orgId: organization.id }} className="w-full cursor-pointer">
								<SidebarMenuButton
									size="small"
									className="cursor-pointer"
									icon={<IconProgress size={16} />}
									tooltip={"Tasks"}
								>
									<span>Tasks</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
						<SidebarMenuItem
							className="cursor-pointer min-h-auto"
							isActive={pathname.includes(`/${organization.id}/views`)}
						>
							<Link to={`/$orgId/views`} params={{ orgId: organization.id }} className="w-full cursor-pointer">
								<SidebarMenuButton
									size="small"
									className="cursor-pointer"
									icon={<IconStack2 size={16} />}
									tooltip={"Views"}
								>
									<span>Views</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
						<SidebarMenuItem
							className="cursor-pointer min-h-auto"
							isActive={pathname.includes(`/${organization.id}/releases`)}
						>
							<Link
								to={`/$orgId/releases`}
								params={{ orgId: organization.id }}
								search={{
									status: undefined,
									targetDateFrom: undefined,
									targetDateTo: undefined,
									releasedFrom: undefined,
									releasedTo: undefined,
								}}
								className="w-full cursor-pointer"
							>
								<SidebarMenuButton
									size="small"
									className="cursor-pointer"
									icon={<IconRocket size={16} />}
									tooltip={"Releases"}
								>
									<span>Releases</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
						<SidebarMenuItem
							className="cursor-pointer min-h-auto"
							isActive={pathname.includes(`/settings/org/${organization.id}`)}
						>
							<Link
								to={`/settings/org/$orgId`}
								params={{ orgId: organization.id }}
								className="w-full cursor-pointer"
							>
								<SidebarMenuButton
									size="small"
									className="cursor-pointer"
									icon={<IconSettings size={16} />}
									tooltip={"Manage"}
								>
									<span>Manage</span>
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					</CollapsibleContent>
				</SidebarGroup>
			</Collapsible>
		</>
	);

	return renderCollapsibleView();
}

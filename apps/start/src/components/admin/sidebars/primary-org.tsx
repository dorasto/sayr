"use client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { SidebarGroup, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@repo/ui/components/doras-ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconDots, IconProgress, IconSettings, IconUsers } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { sidebarStore } from "@/lib/sidebar/sidebar-store";

// import UpdateOrgDialog from "@/app/components/admin/global/org/management/update/edit-org-dialog"; // TODO: Port this
// import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog"; // TODO: Port this

interface OrgSectionProps {
	organization: schema.OrganizationWithMembers;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	// new sidebar
	const sidebarId = "primary-sidebar";
	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	const isSidebarOpen = sidebar?.open ?? true;

	// legacy
	// const { isOpen: isDialogOpen, openDialog, setIsOpen } = useUpdateOrgDialog();
	// const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);
	const [editOpen, setEditOpen] = useState(false);
	const location = useLocation();
	const path = location.publicHref;
	const isActive = path.includes(`/admin/${organization.id}`);
	const [collapsibleOpen, setCollapsibleOpen] = useState(path.includes(`/admin/${organization.id}`));
	const closeMobileSidebarOnClick = () => {
		if (isMobile) {
			closeMobileSidebar();
		}
	};

	// Desktop + Sidebar Open: Collapsible with full content
	const renderCollapsibleView = () => (
		<Collapsible
			key={organization.id}
			open={collapsibleOpen}
			onOpenChange={setCollapsibleOpen}
			className={cn(
				"group/collapsible hover:bg-card bg-card/50 transition-all rounded-lg",
				path.includes(`/admin/${organization.id}`) ? "bg-card" : "bg-transparent"
			)}
		>
			<SidebarGroup className={cn("")}>
				<SidebarMenuItem
					className={cn("hover:bg-transparent bg-transparent w-full px-0")}
					isActive={path.includes(`/admin/${organization.id}`)}
				>
					<div
						className={cn(
							"flex items-center justify-center gap-1 hover:bg-sidebar-accent rounded-lg transition-all group/coltrig w-full text-sidebar-foreground h-9",
							path === `/admin/${organization.id}` && "bg-transparent"
						)}
					>
						<SidebarMenuButton
							icon={
								<CollapsibleTrigger
									asChild
									className="group/trigger data-[state=open]:group-data-[state=open]/trigger:rotate-180 cursor-pointer text-sidebar-foreground"
								>
									<div className="h-4 w-4 aspect-square relative flex items-center justify-center">
										<IconChevronRight className="absolute inset-0 h-4 w-4 bg-transparent text-transparent hover:bg-border group-hover/coltrig:bg-sidebar-accent group-hover/coltrig:text-sidebar-foreground duration-200 group-data-[state=open]/trigger:rotate-90 transition-transform z-20 rounded-md" />
										<Avatar className="h-4 w-4 rounded-md absolute inset-0 duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
											<AvatarImage src={organization.logo || ""} alt={organization.name} className="" />
											<AvatarFallback className="rounded-md uppercase text-xs">
												<IconUsers className="h-4 w-4" />
											</AvatarFallback>
										</Avatar>
									</div>
								</CollapsibleTrigger>
							}
						></SidebarMenuButton>

						<Link
							to={`/admin/${organization.id}`}
							className="w-full cursor-pointer"
							onClick={() => {
								setCollapsibleOpen(true);
								closeMobileSidebarOnClick();
							}}
						>
							<p
								className={cn(
									"hover:bg-transparent font-semibold text-sidebar-foreground/70 group-hover/coltrig:text-sidebar-foreground cursor-pointer",
									isActive && "text-sidebar-foreground"
								)}
							>
								<span>{organization.name}</span>
							</p>
						</Link>
						{renderDropdown({
							customTrigger: (
								<SidebarMenuSub>
									<SidebarMenuButton
										icon={
											<IconDots
												className={cn(
													"text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/coltrig:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border cursor-pointer"
												)}
											/>
										}
									></SidebarMenuButton>
								</SidebarMenuSub>
							),
						})}
					</div>
				</SidebarMenuItem>
				<CollapsibleContent>
					<SidebarMenuItem
						className="cursor-pointer px-0"
						isActive={path.includes(`/admin/${organization.id}/tasks`)}
					>
						<Link to={`/admin/${organization.id}/tasks`} className="w-full cursor-pointer">
							<SidebarMenuButton className="cursor-pointer" icon={<IconProgress size={16} />} tooltip={"Tasks"}>
								<span>Tasks</span>
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);

	// Desktop + Sidebar Closed: Dropdown with organization options
	const renderDropdownView = () => <SidebarMenuItem>{renderDropdown({})}</SidebarMenuItem>;

	interface DropdownProps {
		customTrigger?: React.ReactNode;
	}
	const renderDropdown = (props: DropdownProps) => (
		<DropdownMenu open={editOpen} onOpenChange={setEditOpen}>
			<DropdownMenuTrigger asChild>
				{props.customTrigger ? (
					props.customTrigger
				) : (
					<SidebarMenuButton
						tooltip={organization.name}
						icon={
							<Avatar className="h-4 w-4 rounded-md">
								<AvatarImage src={organization.logo || ""} alt={organization.name} />
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
						}
					>
						<span>{organization.name}</span>
					</SidebarMenuButton>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className={cn(
					"w-60 rounded-lg p-0 z-[999]",
					isMobile && "w-(--radix-dropdown-menu-trigger-width) min-w-56"
				)}
				side={isMobile ? "top" : "right"}
				align="start"
			>
				<DropdownMenuLabel className="flex items-start gap-3 bg-background p-2 border-b">
					<Avatar className="h-9 w-9 rounded-md">
						<AvatarImage src={organization.logo || ""} alt={organization.name} />
						<AvatarFallback className="rounded-md uppercase text-xs">
							<IconUsers className="h-4 w-4" />
						</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-col">
						<span className="text-foreground truncate text-sm font-medium">{organization.name}</span>
						<span className="text-muted-foreground truncate text-xs font-normal">
							{organization.slug}.{process.env.VITE_ROOT_DOMAIN}
						</span>
					</div>
					<a
						href={`/admin/settings/org/${organization.id}`}
						onClick={closeMobileSidebarOnClick}
						className="ml-auto"
					>
						<Button variant={"accent"} className="h-9 w-9 ml-auto aspect-square p-0">
							<IconSettings className="h-4 w-4" />
						</Button>
					</a>
				</DropdownMenuLabel>

				<DropdownMenuLabel>Projects</DropdownMenuLabel>
				<DropdownMenuGroup className="p-1">
					<DropdownMenuItem asChild>
						<Link to={`/admin/${organization.id}/tasks`} className="flex items-center gap-2">
							<IconProgress className="h-4 w-4" />
							<span>Tasks</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	// Determine which view to render based on state
	const getOrganizationView = () => {
		if (isMobile) {
			return renderCollapsibleView();
		}
		if (isSidebarOpen) {
			return renderCollapsibleView();
		}
		return renderDropdownView();
	};

	return (
		<>
			{getOrganizationView()}

			{/* <UpdateOrgDialog organization={organization} isOpen={isDialogOpen} onOpenChange={setIsOpen} /> */}
		</>
	);
}

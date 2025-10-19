"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@repo/ui/components/custom-sidebar-localstorage";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@repo/ui/components/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconPencil, IconPlus, IconProgress, IconSettings, IconUsers } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UpdateOrgDialog from "@/app/components/admin/global/org/management/update/edit-org-dialog";
import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog";
import CreateProjectDialog from "../../admin/global/project/create-project-dialog";

interface OrgSectionProps {
	organization: schema.OrganizationWithMembers;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	const { isOpen: isDialogOpen, openDialog, setIsOpen } = useUpdateOrgDialog();
	const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
	const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);
	const [editOpen, setEditOpen] = useState(false);
	const path = usePathname();
	const isActive = path.includes(`/admin/${organization.id}`);
	const closeMobileSidebarOnClick = () => {
		if (isMobile) {
			closeMobileSidebar();
		}
	};

	// Desktop + Sidebar Open: Collapsible with full content
	const renderCollapsibleView = () => (
		<Collapsible key={organization.id} defaultOpen={isActive} className="group/collapsible">
			<SidebarGroup className={cn("flex flex-col gap-1")}>
				<SidebarGroupLabel asChild>
					<div
						className={cn(
							"flex items-center justify-center hover:bg-sidebar-accent rounded-md transition-all group/coltrig w-full text-sidebar-foreground",
							path === `/admin/${organization.id}` && "bg-sidebar-accent"
						)}
					>
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
						<Link href={`/admin/${organization.id}`} className="w-full cursor-pointer">
							<SidebarMenuButton
								className={cn(
									"hover:bg-transparent font-semibold text-sidebar-foreground/70 group-hover/coltrig:text-sidebar-foreground cursor-pointer"
									// isActive && "text-sidebar-foreground"
								)}
							>
								<span>{organization.name}</span>
							</SidebarMenuButton>
						</Link>
						{renderDropdown({
							customTrigger: (
								<Button
									className={cn(
										"text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/collapsible:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border",
										isMobile && "text-sidebar-foreground"
									)}
								>
									<MoreHorizontal />
									<span className="sr-only">More</span>
								</Button>
							),
						})}
					</div>
				</SidebarGroupLabel>
				<CollapsibleContent className="">
					<SidebarGroupContent className="">
						<SidebarMenu className="">
							{organization.projects.length > 0 &&
								organization.projects.map((project) => (
									<SidebarMenuItem key={project.id} className="">
										<SidebarMenuButton
											asChild
											isActive={path.includes(`/admin/${organization.id}/${project.id}`)}
											className=""
										>
											<Link href={`/admin/${organization.id}/${project.id}`} className="">
												<div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
													<IconProgress />
												</div>
												<span>{project.name}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
						</SidebarMenu>
					</SidebarGroupContent>
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
					<SidebarMenuButton tooltip={organization.name}>
						<Avatar className="h-4 w-4 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
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
							{organization.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
						</span>
					</div>
					<Button
						variant={"accent"}
						className="h-9 w-9 ml-auto aspect-square p-0"
						onClick={() => {
							openDialog();
							setEditOpen(false);
						}}
					>
						<IconSettings className="h-4 w-4" />
					</Button>
				</DropdownMenuLabel>

				<DropdownMenuLabel>Projects</DropdownMenuLabel>
				<DropdownMenuGroup className="p-1">
					{organization.projects.length > 0 ? (
						organization.projects.map((project) => (
							<DropdownMenuItem asChild key={project.id}>
								<Link href={`/admin/${organization.id}/${project.id}`} className="flex items-center gap-2">
									<IconProgress className="h-4 w-4" />
									<span>{project.name}</span>
								</Link>
							</DropdownMenuItem>
						))
					) : (
						<DropdownMenuLabel>No projects</DropdownMenuLabel>
					)}
					<DropdownMenuItem onClick={() => [setIsProjectDialogOpen(true)]} className="flex items-center gap-2">
						<IconPlus className="h-4 w-4" />
						Create a new project
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
		if (isOpen) {
			return renderCollapsibleView();
		}
		return renderDropdownView();
	};

	return (
		<>
			<SidebarMenu>{getOrganizationView()}</SidebarMenu>

			<UpdateOrgDialog organization={organization} isOpen={isDialogOpen} onOpenChange={setIsOpen} />

			<CreateProjectDialog
				organization={organization}
				open={isProjectDialogOpen}
				onOpenChange={setIsProjectDialogOpen}
			/>
		</>
	);
}

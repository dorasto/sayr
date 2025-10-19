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
	// const isActive = path.includes(`/admin/${organization.id}`);

	// Desktop + Sidebar Open: Collapsible with full content
	const renderCollapsibleView = () => (
		<Collapsible key={organization.id} defaultOpen className="group/collapsible">
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
								<Avatar className="h-4 w-4 rounded-md absolute inset-0 duration-200 transition-none select-none group-hover/coltrig:h-0">
									<AvatarImage src={organization.logo || ""} alt={organization.name} />
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

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className={cn(
										"text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/collapsible:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border",
										isMobile && "text-sidebar-foreground"
									)}
								>
									<MoreHorizontal />
									<span className="sr-only">More</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-48 rounded-lg z-[999]" side="right" align="start">
								<DropdownMenuItem onClick={openDialog}>
									<IconPencil className="text-muted-foreground" />
									<span>Update</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</SidebarGroupLabel>
				<CollapsibleContent className="">
					<SidebarGroupContent className="">
						<SidebarMenu className="">
							<Collapsible defaultOpen className="group/coltasks flex flex-col gap-0.5">
								{/* start */}

								<SidebarMenuItem className="mb-0.5">
									<div
										className={cn(
											"flex items-center justify-center pl-2 pr-1 hover:bg-sidebar-accent rounded-md transition-all group/coltrig"
										)}
									>
										<CollapsibleTrigger
											asChild
											className="group/trigger data-[state=open]:group-data-[state=open]/trigger:rotate-180 cursor-pointer pl-2"
										>
											<div className="flex items-center w-full justify-start">
												<div className="h-4 w-4 aspect-square relative flex items-center justify-center">
													<IconChevronRight className="absolute inset-0 h-4 w-4 bg-transparent text-transparent hover:bg-border group-hover/coltrig:bg-sidebar-accent group-hover/coltrig:text-sidebar-foreground duration-200 group-data-[state=open]/trigger:rotate-90 transition-transform z-20 rounded-md" />
													<IconProgress className="h-4 w-4 rounded-md absolute inset-0 duration-200 transition-none select-none group-hover/coltrig:h-0" />
												</div>
												<SidebarMenuButton
													className={cn(
														"hover:bg-transparent hover:text-sidebar-foreground group-hover/coltrig:text-sidebar-foreground cursor-pointer"
													)}
												>
													<span>Projects</span>
												</SidebarMenuButton>
											</div>
										</CollapsibleTrigger>

										<Button
											className={cn(
												"text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/collapsible:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border",
												isMobile && "text-sidebar-foreground"
											)}
											onClick={() => setIsProjectDialogOpen(true)}
										>
											<IconPlus />
											<span className="sr-only">add</span>
										</Button>
									</div>
								</SidebarMenuItem>

								<CollapsibleContent className="content">
									<SidebarMenu className="">
										{organization.projects.length > 0 &&
											organization.projects.map((project) => (
												<SidebarMenuItem key={project.id} className="">
													<SidebarMenuButton
														asChild
														isActive={path.includes(`/admin/${organization.id}/${project.id}`)}
														className="pl-6"
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
								</CollapsibleContent>
							</Collapsible>
						</SidebarMenu>
					</SidebarGroupContent>
				</CollapsibleContent>
			</SidebarGroup>
		</Collapsible>
	);

	// Desktop + Sidebar Closed: Dropdown with organization options
	const renderDropdownView = () => (
		<SidebarMenuItem>
			<DropdownMenu open={editOpen} onOpenChange={setEditOpen}>
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton tooltip={organization.name}>
						<Avatar className="h-4 w-4 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
						<span>{organization.name}</span>
					</SidebarMenuButton>
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
					{/* <DropdownMenuGroup className="p-1">
						<DropdownMenuItem asChild>
							<a href="/" className="flex items-center gap-2">
								<IconLibrary className="h-4 w-4" />
								<span>Tasks</span>
							</a>
						</DropdownMenuItem>
					</DropdownMenuGroup> */}
					{organization.projects.length > 0 ? (
						organization.projects.map((project) => (
							<DropdownMenuGroup className="p-1" key={project.id}>
								<DropdownMenuLabel>Projects</DropdownMenuLabel>
								<DropdownMenuItem asChild>
									<Link href={`/admin/${organization.id}/${project.id}`} className="flex items-center gap-2">
										<IconProgress className="h-4 w-4" />
										<span>{project.name}</span>
									</Link>
								</DropdownMenuItem>
							</DropdownMenuGroup>
						))
					) : (
						<DropdownMenuGroup className="p-1">
							<DropdownMenuLabel>No projects</DropdownMenuLabel>
							<DropdownMenuItem>Create</DropdownMenuItem>
						</DropdownMenuGroup>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);

	// Mobile: Drawer with organization details
	const renderDrawerView = () => (
		<SidebarMenuItem>
			<Drawer open={editOpen} onOpenChange={setEditOpen}>
				<DrawerTrigger asChild>
					<SidebarMenuButton tooltip={organization.name}>
						<Avatar className="h-4 w-4 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<IconUsers className="h-4 w-4" />
							</AvatarFallback>
						</Avatar>
						<span>{organization.name}</span>
					</SidebarMenuButton>
				</DrawerTrigger>
				<DrawerContent
					className="z-[999] mx-auto max-h-[60%] h-full w-full bg-sidebar p-0 px-4 text-sidebar-foreground [&>button]:hidden"
					overlay
					overlayClassName="z-[999]"
				>
					<DrawerHeader>
						<div className="flex items-center gap-2">
							<Avatar className="h-12 w-12 rounded-md">
								<AvatarImage src={organization.logo || ""} alt={organization.name} />
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-10 w-10" />
								</AvatarFallback>
							</Avatar>
							<div>
								<DrawerTitle className="text-lg! text-left">{organization.name}</DrawerTitle>
								<DrawerDescription className="text-left">x members</DrawerDescription>
							</div>
							<Button
								variant={"accent"}
								onClick={() => {
									openDialog();
									setEditOpen(false);
								}}
								className="ml-auto"
							>
								<IconPencil className="text-muted-foreground" />
								<span>Update</span>
							</Button>
						</div>
					</DrawerHeader>
				</DrawerContent>
			</Drawer>
		</SidebarMenuItem>
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

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import {
	SidebarGroup,
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
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@repo/ui/components/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { IconChevronRight, IconLibrary, IconPencil, IconUsers } from "@tabler/icons-react";
import { Command, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UpdateOrgDialog from "@/app/components/admin/organizations/management/update";
import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog";

interface Organization {
	id: string;
	name: string;
	logo?: string | null;
	slug: string;
	metadata?: Record<string, unknown>;
}

interface OrgSectionProps {
	organization: Organization;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const { isOpen: isDialogOpen, openDialog, setIsOpen } = useUpdateOrgDialog();
	const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);
	const [mobileEditOpen, setMobileEditOpen] = useState(false);

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>
					<span>Organizations</span>
				</SidebarGroupLabel>

				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<Command /> <span>Test asd asd asd asd a</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
					{isOpen ? (
						<Collapsible key={organization.id} defaultOpen className="group/collapsible">
							<SidebarMenuItem className="">
								<div className="flex items-center justify-center pl-2 pr-1 hover:bg-sidebar-accent rounded-md transition-all group/coltrig">
									<CollapsibleTrigger
										asChild
										className="group/trigger data-[state=open]:group-data-[state=open]/trigger:rotate-180"
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
									<a href="/" className="w-full">
										<SidebarMenuButton className="hover:bg-transparent hover:text-sidebar-foreground group-hover/coltrig:text-sidebar-foreground">
											<span>{organization.name}</span>
										</SidebarMenuButton>
									</a>

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button className="text-sidebar-foreground/0 aspect-square p-0 h-4 group-hover/collapsible:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border">
												<MoreHorizontal />
												<span className="sr-only">More</span>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent
											className="w-48 rounded-lg"
											side={isMobile ? "bottom" : "right"}
											align={isMobile ? "end" : "start"}
										>
											<DropdownMenuItem onClick={openDialog}>
												<IconPencil className="text-muted-foreground" />
												<span>Update</span>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<CollapsibleContent>
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<a href="/">
													<IconLibrary />
													Tasks
												</a>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem>
							<Drawer open={mobileEditOpen} onOpenChange={setMobileEditOpen}>
								<DrawerTrigger asChild>
									<SidebarMenuButton tooltip={organization.name}>
										<Avatar className="h-4 w-4 rounded-md">
											<AvatarImage src={organization.logo || ""} alt={organization.name} />
											<AvatarFallback className="rounded-md uppercase text-xs">
												<IconUsers className="h-4 w-4" />
											</AvatarFallback>
										</Avatar>
										<span>Test asd asd asd asd a</span>
									</SidebarMenuButton>
								</DrawerTrigger>
								<DrawerContent>
									<DrawerHeader>
										<div className="flex items-center gap-2">
											<Avatar className="h-10 w-10 rounded-md">
												<AvatarImage src={organization.logo || ""} alt={organization.name} />
												<AvatarFallback className="rounded-md uppercase text-xs">
													<IconUsers className="h-10 w-10" />
												</AvatarFallback>
											</Avatar>
											<div>
												<DrawerTitle>{organization.name}</DrawerTitle>
												<DrawerDescription>x members</DrawerDescription>
											</div>
											<Button
												variant={"accent"}
												onClick={() => {
													openDialog();
													setMobileEditOpen(false);
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
					)}
				</SidebarMenu>
			</SidebarGroup>
			<UpdateOrgDialog organization={organization} isOpen={isDialogOpen} onOpenChange={setIsOpen} />
		</>
	);
}

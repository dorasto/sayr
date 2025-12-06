import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Collapsible, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { SidebarGroup, SidebarMenuButton, SidebarMenuItem } from "@repo/ui/components/doras-ui/sidebar";

import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronRight, IconUsers } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

// import UpdateOrgDialog from "@/app/components/admin/global/org/management/update/edit-org-dialog"; // TODO: Port this
// import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog"; // TODO: Port this

interface OrgSectionProps {
	organization: schema.OrganizationWithMembers;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	// new sidebar
	// const sidebarId = "primary-sidebar";
	// const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	// const isSidebarOpen = sidebar?.open ?? true;

	// legacy
	// const { isOpen: isDialogOpen, openDialog, setIsOpen } = useUpdateOrgDialog();
	// const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);
	// const [editOpen, setEditOpen] = useState(false);
	const location = useLocation();
	const path = location.pathname;
	// const isActive = path.includes(`/admin/${organization.id}`);
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
							to={`/admin/${organization.id}` as any}
							className="w-full cursor-pointer"
							onClick={() => {
								setCollapsibleOpen(true);
								closeMobileSidebarOnClick();
							}}
						>
							<span className="truncate font-medium">{organization.name}</span>
						</Link>
					</div>
				</SidebarMenuItem>
			</SidebarGroup>
		</Collapsible>
	);

	// Simplified for brevity, you can add the other views (collapsed, mobile) here following the same pattern
	return renderCollapsibleView();
}

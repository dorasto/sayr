import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarSubmenuItem,
} from "@repo/ui/components/doras-ui/sidebar";
import { Kbd } from "@repo/ui/components/kbd";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
	IconBuilding,
	IconLayoutSidebar,
	IconLayoutSidebarFilled,
	IconPlus,
	IconQuestionMark,
	IconSearch,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { StatusBar } from "@/components/generic/status";
import CreateOrganizationDialog from "@/components/organization/create-organization-dialog";
import { useTasksSearchParams } from "@/hooks/useTasksSearchParams";
import { commandActions } from "@/lib/command-store";
import { heading, navigation } from "@/lib/routemap";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";
import { notificationStore } from "@/lib/stores/notification-store";
import { FavouritesSection } from "./favourites-section";
import { OrgSortableList } from "./org-sortable-list";
import { SidebarGroupToggle } from "./sidebar-group-toggle";
import { markSidebarClick, sidebarItemId, useActiveSidebarItem } from "./use-active-sidebar-item";
import UserDropdown from "./user-dropdown";
export function PrimarySidebar() {
	const sidebarId = "primary-sidebar";
	const isMobile = useIsMobile();

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
	const { clearSearchParams } = useTasksSearchParams();
	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	const isSidebarOpen = sidebar ? sidebar.open || sidebar.overlayOpen === true : true;
	const inboxCount = useStore(notificationStore, (state) => state.unreadCount);
	const activeItemId = useActiveSidebarItem();
	const [organizationsOpen, setOrganizationsOpen] = useState(true);
	const closeMobileSidebar = () => {
		if (isMobile) {
			sidebarActions.closeSidebarOverlay(sidebarId);
		}
	};
	return (
		<Sidebar id={sidebarId} collapsible resizable keyboardShortcut="b" className="">
			<SidebarHeader className="pt-3.5 pb-0">
				{heading.map((section) => (
					<SidebarMenu
						key={section.title}
						className="gap-0.5 flex flex-row items-center"
						// className="gap-0.5"
					>
						{section.items.map((item) => {
							const itemId = sidebarItemId.nav(item.url);
							const isActive = activeItemId === itemId;
							const IconComponent = isActive && item.activeIcon ? item.activeIcon : item.icon;

							return (
								<SidebarMenuItem key={item.title} isActive={isActive} className="min-h-0 w-fit">
									<Link
										className=""
										to={item.url}
										onClick={(event) => {
											markSidebarClick(itemId);
											if (item.url !== "/home" || pathname !== item.url) return;
											// Already on /home — a bare <Link to="/home"> with no search prop
											// doesn't clear existing params (e.g. a saved view's ?view=... or
											// leftover ?filters=...), so clicking "Dashboard" while a favourite
											// is applied looked like it did nothing. Clear the board's search
											// params directly instead of relying on the router's own
											// navigation, same reasoning as FavouritesSection's own bypass.
											event.preventDefault();
											clearSearchParams();
										}}
									>
										<SidebarMenuButton size="small" tooltip={item.title} icon={<IconComponent size={16} />}>
											<span>{item.title}</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
							);
						})}
						{!isMobile && (
							<SidebarMenuItem className="min-w-0 min-h-auto max-w-fit size-7! aspect-square! m-auto">
								<SidebarMenuButton
									size="small"
									tooltip={"Search"}
									icon={<IconSearch className="size-4!" />}
									onClick={() => commandActions.open()}
									className="aspect-square! flex items-center justify-center"
								/>
							</SidebarMenuItem>
						)}
						{!isMobile && (
							<SidebarMenuItem className="min-w-0 min-h-auto max-w-fit size-7! aspect-square! m-auto text-primary! transition-all">
								<SidebarMenuButton
									size="small"
									tooltip={"Create"}
									icon={<IconPlus className="size-4!" />}
									onClick={() => commandActions.openCreateTaskDialog()}
									className="aspect-square! flex items-center justify-center transition-all"
								/>
							</SidebarMenuItem>
						)}
					</SidebarMenu>
				))}
			</SidebarHeader>
			{/* Same 12px section gap above Inbox (pt-3, after the header's Dashboard) and above Organizations (gap-3); Inbox + Favourites flow as rows. */}
			<SidebarContent className="flex flex-col gap-3 pt-3">
				<div className="flex flex-col gap-0.5">
					{navigation.map((section) => (
						<SidebarGroup key={section.title}>
							{section.title === "Overview" ? null : <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
							<SidebarMenu className="gap-0.5">
								{section.items.map((item) => {
									const itemId = sidebarItemId.nav(item.url);
									const isActive = activeItemId === itemId;
									const IconComponent = isActive && item.activeIcon ? item.activeIcon : item.icon;

									return (
										<SidebarMenuItem className="min-h-auto" key={item.title} isActive={isActive}>
											<Link to={item.url} className="w-full" onClick={() => markSidebarClick(itemId)}>
												<SidebarMenuButton
													size="small"
													icon={<IconComponent size={16} />}
													tooltip={item.title}
												>
													<span>{item.title}</span>
												</SidebarMenuButton>
											</Link>
											{item.title === "Inbox" && inboxCount > 0 && (
												<SidebarMenuSub className="h-3 max-h-3">
													<SidebarSubmenuItem className="h-3 max-h-3">
														{inboxCount > 99 ? "99+" : inboxCount}
													</SidebarSubmenuItem>
												</SidebarMenuSub>
											)}
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroup>
					))}
					<FavouritesSection />
				</div>
				{/* Each org is its own section (primary-org.tsx) inside the collapsible Organizations group. */}
				<SidebarGroup>
					<SidebarGroupToggle
						label="Organizations"
						icon={<IconBuilding size={16} />}
						open={organizationsOpen}
						onOpenChange={setOrganizationsOpen}
					>
						<SidebarMenu className="org-sidebar-menu gap-0.5">
							<OrgSortableList closeMobileSidebar={closeMobileSidebar}>
								<SidebarMenuItem className="min-h-auto">
									<CreateOrganizationDialog
										trigger={
											<SidebarMenuButton
												size="small"
												tooltip="New organization"
												icon={<IconPlus size={16} />}
											>
												<span>New organization</span>
											</SidebarMenuButton>
										}
									/>
								</SidebarMenuItem>
							</OrgSortableList>
						</SidebarMenu>
					</SidebarGroupToggle>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t-transparent">
				<StatusBar />
				<SidebarMenu className="gap-0.5">
					{isMobile && (
						<SidebarMenuItem className="min-h-auto">
							<SidebarMenuButton
								size="small"
								tooltip={"Search"}
								icon={<IconSearch />}
								onClick={() => commandActions.open()}
							>
								{" "}
								Search
							</SidebarMenuButton>
							<SidebarMenuSub className="">
								<Kbd>⌘K</Kbd>
							</SidebarMenuSub>
						</SidebarMenuItem>
					)}
					<SidebarMenuItem className={cn("min-h-auto", isMobile && "hidden")}>
						<SidebarMenuButton
							size="small"
							tooltip={isSidebarOpen ? "Collapse" : "Expand"}
							onClick={() => sidebarActions.toggleSidebar(sidebarId)}
							icon={isSidebarOpen ? <IconLayoutSidebarFilled /> : <IconLayoutSidebar />}
						>
							{" "}
							{isSidebarOpen ? "Collapse" : "Expand"}
						</SidebarMenuButton>
					</SidebarMenuItem>

					<SidebarMenuItem className="min-h-auto">
						<a href={"https://platform.sayr.io"} className="w-full">
							<SidebarMenuButton size="small" icon={<IconQuestionMark />} tooltip="Feedback">
								Feedback
							</SidebarMenuButton>
						</a>
					</SidebarMenuItem>
					<UserDropdown />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

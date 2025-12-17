"use client";
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
} from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
	IconLayoutSidebar,
	IconLayoutSidebarFilled,
	IconSettings,
	IconShield,
} from "@tabler/icons-react";
import { Link, useLocation, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useLayoutData } from "@/components/generic/Context";
import { heading, navigation } from "@/lib/routemap";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";
import OrgSection from "./primary-org";
import UserDropdown from "./user-dropdown";
export function PrimarySidebar() {
	const sidebarId = "primary-sidebar";
	const isMobile = useIsMobile();

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const pathname =
		rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
	const { account, organizations } = useLayoutData();
	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	const isSidebarOpen = sidebar?.open ?? true;
	const closeMobileSidebar = () => {
		if (isMobile) {
			sidebarActions.setOpen(sidebarId, false, true);
		}
	};
	return (
		<Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
			<SidebarHeader className="pb-0">
				{heading.map((section) => (
					<SidebarMenu key={section.title}>
						{section.items.map((item) => {
							const isActive = pathname === item.url;
							const IconComponent =
								isActive && item.activeIcon ? item.activeIcon : item.icon;

							return (
								<SidebarMenuItem key={item.title} isActive={isActive}>
									<Link className="w-full" to={item.url}>
										<SidebarMenuButton
											tooltip={item.title}
											icon={<IconComponent size={16} />}
										>
											<span>{item.title}</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				))}
			</SidebarHeader>
			<SidebarContent>
				{navigation.map((section) => (
					<SidebarGroup key={section.title}>
						{section.title === "Overview" ? null : (
							<SidebarGroupLabel>{section.title}</SidebarGroupLabel>
						)}
						<SidebarMenu>
							{section.items.map((item) => {
								const isActive = pathname === item.url;
								const IconComponent =
									isActive && item.activeIcon ? item.activeIcon : item.icon;

								return (
									<SidebarMenuItem key={item.title} isActive={isActive}>
										<Link to={item.url} className="w-full">
											<SidebarMenuButton
												icon={<IconComponent size={16} />}
												tooltip={item.title}
											>
												<span>{item.title}</span>
											</SidebarMenuButton>
										</Link>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroup>
				))}
				<SidebarGroup>
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
						Organizations
					</SidebarGroupLabel>

					<SidebarMenu
						className={cn("org-sidebar-menu", isSidebarOpen && "gap-2")}
					>
						{organizations
							.flatMap((org) => [
								<OrgSection
									closeMobileSidebar={closeMobileSidebar}
									key={org.id}
									organization={org}
								/>,
								// <div key={org.id}></div>
							])
							.filter(Boolean)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t-transparent">
				<SidebarMenu>
					<SidebarMenuItem className="">
						<SidebarMenuButton
							tooltip={isSidebarOpen ? "Collapse" : "Expand"}
							onClick={() => sidebarActions.toggleSidebar(sidebarId)}
							icon={
								isSidebarOpen ? (
									<IconLayoutSidebarFilled />
								) : (
									<IconLayoutSidebar />
								)
							}
						>
							{" "}
							{isSidebarOpen ? "Collapse" : "Expand"}
						</SidebarMenuButton>
					</SidebarMenuItem>
					{account.role === "admin" && (
						<SidebarMenuItem className="">
							<Link to={"/admin/"} className="w-full">
								<SidebarMenuButton
									icon={<IconShield />}
									tooltip="Admin console"
								>
									Admin console
								</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					)}
					<SidebarMenuItem className="">
						<Link to={"/admin/settings"} className="w-full">
							<SidebarMenuButton icon={<IconSettings />} tooltip="Settings">
								Settings
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
					<UserDropdown />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

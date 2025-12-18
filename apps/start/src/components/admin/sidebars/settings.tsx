import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
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
	useSidebar,
} from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
	IconArrowLeft,
	IconCategory,
	IconCategoryFilled,
	IconHttpConnect,
	IconLayoutSidebar,
	IconLayoutSidebarFilled,
	IconPlug,
	IconStack2,
	IconStack2Filled,
	IconTag,
	IconTagFilled,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useLayoutData } from "@/components/generic/Context";
import { navigationStore } from "@/lib/navigation-store";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import UserDropdown from "./user-dropdown";

export function SettingsSidebar() {
	const sidebarId = "primary-sidebar"; // Sharing the same ID to maintain state
	const location = useLocation();
	const pathname = location.pathname;
	const { isCollapsed } = useSidebar(sidebarId);
	const isSidebarOpen = !isCollapsed;
	const { organizations } = useLayoutData();
	const isMobile = useIsMobile();
	const lastDashboardRoute = useStore(
		navigationStore,
		(state) => state.lastDashboardRoute,
	);
	const settingsNavigation = [
		{
			title: "Account",
			url: "/admin/settings",
			icon: IconUser,
		},
		{
			title: "Connections",
			url: "/admin/settings/connections",
			icon: IconHttpConnect,
		},
	];
	const orgSubItems = [
		{
			title: "Connections",
			slug: "connections",
			icon: IconPlug,
			activeIcon: IconPlug,
			activeClass: "fill-white",
			matchType: "includes",
		},
		{
			title: "Members",
			slug: "members",
			icon: IconUsers,
			activeIcon: IconUsers,
			activeClass: "fill-white",
			matchType: "exact",
		},
		{
			title: "Labels",
			slug: "labels",
			icon: IconTag,
			activeIcon: IconTagFilled,
			matchType: "exact",
		},
		{
			title: "Categories",
			slug: "categories",
			icon: IconCategory,
			activeIcon: IconCategoryFilled,
			matchType: "exact",
		},
		{
			title: "Views",
			slug: "views",
			icon: IconStack2,
			activeIcon: IconStack2Filled,
			matchType: "includes",
		},
	];
	return (
		<Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
			<SidebarHeader className="pb-0">
				<SidebarMenu>
					<SidebarMenuItem>
						<Link className="w-full" to={lastDashboardRoute}>
							<SidebarMenuButton
								tooltip="Back to Dashboard"
								icon={<IconArrowLeft size={16} />}
							>
								<span>Back to Dashboard</span>
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="flex flex-col gap-3">
				<SidebarGroup>
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
						Settings
					</SidebarGroupLabel>
					<SidebarMenu className="gap-0.5">
						{settingsNavigation.map((item) => {
							const isActive = pathname === item.url;
							return (
								<SidebarMenuItem
									key={item.title}
									isActive={isActive}
									className="min-h-auto"
								>
									<Link to={item.url} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={<item.icon size={16} />}
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
				<SidebarGroup className="">
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
						Organizations
					</SidebarGroupLabel>
					{organizations
						.flatMap((org) => [
							<SidebarMenu className="gap-0.5 pb-3 last:pb-0" key={org.id}>
								<SidebarMenuItem
									className="min-h-auto"
									isActive={pathname === `/admin/settings/org/${org.id}`}
								>
									<Link
										to={`/admin/settings/org/$orgId`}
										params={{ orgId: org.id }}
										className="w-full"
									>
										<SidebarMenuButton
											size="small"
											icon={
												<Avatar className="h-3 w-3">
													<AvatarImage
														src={org.logo || ""}
														alt={org.name}
														className=""
													/>
													<AvatarFallback className="rounded-md uppercase text-xs">
														<IconUsers className="h-3 w-3" />
													</AvatarFallback>
												</Avatar>
											}
											tooltip={org.name}
										>
											<span>{org.name}</span>
										</SidebarMenuButton>
									</Link>
									<SidebarMenuSub>
										<SidebarMenuButton
											size="small"
											className="bg-accent text-xs"
										>
											<span className="truncate font-mono">{org.slug}</span>
										</SidebarMenuButton>
									</SidebarMenuSub>
								</SidebarMenuItem>
								{orgSubItems.map((item) => {
									const url = `/admin/settings/org/${org.id}/${item.slug}`;
									const isActive =
										item.matchType === "includes"
											? pathname.includes(url)
											: pathname === url;
									const Icon = isActive ? item.activeIcon : item.icon;
									return (
										<SidebarMenuItem
											key={item.title}
											hideWhenCollapsed
											className="min-h-auto"
											isActive={isActive}
										>
											<Link to={url} className="w-full">
												<SidebarMenuButton
													size="small"
													icon={
														<Icon
															className={cn(isActive && item.activeClass)}
														/>
													}
													tooltip={item.title}
												>
													<span>{item.title}</span>
												</SidebarMenuButton>
											</Link>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>,
						])
						.filter(Boolean)}
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t-transparent">
				<SidebarMenu className="gap-0.5">
					<SidebarMenuItem className="">
						<SidebarMenuButton
							size="small"
							onClick={() =>
								isMobile
									? sidebarActions.toggleSidebar(sidebarId, true)
									: sidebarActions.toggleSidebar(sidebarId)
							}
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
					<UserDropdown />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

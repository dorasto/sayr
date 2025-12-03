"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
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
	IconTag,
	IconTagFilled,
	IconUser,
	IconUsers,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutData } from "@/app/admin/Context";
import { navigationStore } from "@/app/lib/navigation-store";
import { sidebarActions } from "@/app/lib/sidebar/sidebar-store";
import UserDropdown from "./user-dropdown";

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

export function SettingsSidebar() {
	const sidebarId = "primary-sidebar"; // Sharing the same ID to maintain state
	const pathname = usePathname();
	const { isCollapsed } = useSidebar(sidebarId);
	const isSidebarOpen = !isCollapsed;
	const { organizations } = useLayoutData();
	const isMobile = useIsMobile();
	const lastDashboardRoute = useStore(navigationStore, (state) => state.lastDashboardRoute);

	return (
		<Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
			<SidebarHeader className="pb-0">
				<SidebarMenu>
					<SidebarMenuItem>
						<Link className="w-full" href={lastDashboardRoute} prefetch={false}>
							<SidebarMenuButton tooltip="Back to Dashboard" icon={<IconArrowLeft size={16} />}>
								<span>Back to Dashboard</span>
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="flex flex-col gap-3">
				<SidebarGroup>
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Settings</SidebarGroupLabel>
					<SidebarMenu className="gap-0.5">
						{settingsNavigation.map((item) => {
							const isActive = pathname === item.url;
							return (
								<SidebarMenuItem key={item.title} isActive={isActive} className="min-h-auto">
									<Link href={item.url} prefetch={false} className="w-full">
										<SidebarMenuButton size="small" icon={<item.icon size={16} />} tooltip={item.title}>
											<span>{item.title}</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
				<SidebarGroup className="">
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Organizations</SidebarGroupLabel>
					{organizations
						.flatMap((org) => [
							<SidebarMenu className="gap-0.5 pb-3 last:pb-0" key={org.id}>
								<SidebarMenuItem className="min-h-auto" isActive={pathname === `/admin/settings/org/${org.id}`}>
									<Link href={`/admin/settings/org/${org.id}`} prefetch={false} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={
												<Avatar className="h-3 w-3">
													<AvatarImage src={org.logo || ""} alt={org.name} className="" />
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
										<SidebarMenuButton size="small" className="bg-accent text-xs">
											<span className="truncate font-mono">{org.slug}</span>
										</SidebarMenuButton>
									</SidebarMenuSub>
								</SidebarMenuItem>
								<SidebarMenuItem
									className="min-h-auto"
									isActive={pathname.includes(`/admin/settings/org/${org.id}/connections`)}
									hideWhenCollapsed
								>
									<Link href={`/admin/settings/org/${org.id}/connections`} prefetch={false} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={
												<IconPlug
													className={cn(
														pathname.includes(`/admin/settings/org/${org.id}/connections`) && "fill-white"
													)}
												/>
											}
											tooltip="Item"
										>
											<span>Connections</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
								<SidebarMenuItem
									hideWhenCollapsed
									className="min-h-auto"
									isActive={pathname === `/admin/settings/org/${org.id}/team`}
								>
									<Link href={`/admin/settings/org/${org.id}/team`} prefetch={false} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={
												<IconUsers
													className={cn(pathname === `/admin/settings/org/${org.id}/team` && "fill-white")}
												/>
											}
											tooltip="Item"
										>
											<span>Team</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
								<SidebarMenuItem
									hideWhenCollapsed
									className="min-h-auto"
									isActive={pathname === `/admin/settings/org/${org.id}/labels`}
								>
									<Link href={`/admin/settings/org/${org.id}/labels`} prefetch={false} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={
												pathname === `/admin/settings/org/${org.id}/labels` ? (
													<IconTagFilled />
												) : (
													<IconTag />
												)
											}
											tooltip="Item"
										>
											<span>Labels</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
								<SidebarMenuItem
									hideWhenCollapsed
									className="min-h-auto"
									isActive={pathname === `/admin/settings/org/${org.id}/categories`}
								>
									<Link href={`/admin/settings/org/${org.id}/categories`} prefetch={false} className="w-full">
										<SidebarMenuButton
											size="small"
											icon={
												pathname === `/admin/settings/org/${org.id}/categories` ? (
													<IconCategoryFilled />
												) : (
													<IconCategory />
												)
											}
											tooltip="Item"
										>
											<span>Categories</span>
										</SidebarMenuButton>
									</Link>
								</SidebarMenuItem>
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
							icon={isSidebarOpen ? <IconLayoutSidebarFilled /> : <IconLayoutSidebar />}
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

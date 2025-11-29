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
	useSidebar,
} from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft, IconLayoutSidebar, IconLayoutSidebarFilled, IconPlug, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarActions } from "@/app/lib/sidebar/sidebar-store";
import UserDropdown from "./user-dropdown";

const settingsNavigation = [
	{
		title: "Console",
		url: "/admin/console",
		icon: IconUsers,
	},
	{
		title: "Connections",
		url: "/admin/console/connections",
		icon: IconPlug,
	},
];

export function StaffSidebar() {
	const sidebarId = "primary-sidebar"; // Sharing the same ID to maintain state
	const pathname = usePathname();
	const { isCollapsed } = useSidebar(sidebarId);
	const isSidebarOpen = !isCollapsed;
	const isMobile = useIsMobile();

	return (
		<Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
			<SidebarHeader className="pb-0">
				<SidebarMenu>
					<SidebarMenuItem>
						<Link className="w-full" href="/admin" prefetch={false}>
							<SidebarMenuButton tooltip="Back to Dashboard" icon={<IconArrowLeft size={16} />}>
								<span>Back to Dashboard</span>
							</SidebarMenuButton>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent className="flex flex-col gap-3">
				<SidebarGroup>
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Console</SidebarGroupLabel>
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

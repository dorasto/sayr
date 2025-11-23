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
import {
	IconAdjustmentsHorizontal,
	IconArrowLeft,
	IconHttpConnect,
	IconLayoutSidebar,
	IconLayoutSidebarFilled,
	IconUser,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarActions, sidebarStore } from "@/app/lib/sidebar/sidebar-store";
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
	const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
	const isSidebarOpen = sidebar?.open ?? true;

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
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Settings</SidebarGroupLabel>
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
							onClick={() => sidebarActions.toggleSidebar(sidebarId)}
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

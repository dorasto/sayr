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
import { IconLayoutSidebar, IconLayoutSidebarFilled, IconShield } from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutData } from "@/app/admin/Context";
import { heading, navigation } from "@/app/lib/routemap";
import { sidebarActions, sidebarStore } from "@/app/lib/sidebar/sidebar-store";
import OrgSection from "./primary-org";
import UserDropdown from "./user-dropdown";
export function PrimarySidebar() {
	const sidebarId = "primary-sidebar";
	const isMobile = useIsMobile();
	const pathname = usePathname();
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
							const IconComponent = isActive && item.activeIcon ? item.activeIcon : item.icon;

							return (
								<SidebarMenuItem key={item.title} isActive={isActive}>
									<Link className="w-full" href={item.url} prefetch={false}>
										<SidebarMenuButton tooltip={item.title} icon={<IconComponent size={16} />}>
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
						{section.title === "Overview" ? null : <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
						<SidebarMenu>
							{section.items.map((item) => {
								const isActive = pathname === item.url;
								const IconComponent = isActive && item.activeIcon ? item.activeIcon : item.icon;

								return (
									<SidebarMenuItem key={item.title} isActive={isActive}>
										<Link href={item.url} prefetch={false} className="w-full">
											<SidebarMenuButton icon={<IconComponent size={16} />} tooltip={item.title}>
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
					<SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>Organizations</SidebarGroupLabel>

					<SidebarMenu className={cn("org-sidebar-menu", isSidebarOpen && "gap-2")}>
						{organizations
							.flatMap((org) => [
								<OrgSection closeMobileSidebar={closeMobileSidebar} key={org.id} organization={org} />,
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
							onClick={() => sidebarActions.toggleSidebar(sidebarId)}
							icon={isSidebarOpen ? <IconLayoutSidebarFilled /> : <IconLayoutSidebar />}
						>
							{" "}
							{isSidebarOpen ? "Collapse" : "Expand"}
						</SidebarMenuButton>
					</SidebarMenuItem>
					{account.role === "admin" && (
						<SidebarMenuItem className="">
							<Link href={"/admin/console"} className="w-full">
								<SidebarMenuButton icon={<IconShield />}>Admin Console</SidebarMenuButton>
							</Link>
						</SidebarMenuItem>
					)}
					<UserDropdown />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

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
	SidebarProvider,
	SidebarToggle,
} from "@repo/ui/components/custom-sidebar-localstorage";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconShield, IconUsers } from "@tabler/icons-react";
import { Command } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutData } from "@/app/admin/Context";
import { heading, navigation } from "@/app/lib/routemap";
import OrgSection from "./org-section";
import UserDropdown from "./user-dropdown";

interface Props {
	isOpen: boolean;
}
export function LeftSidebar({ isOpen, ...props }: Props & React.ComponentProps<typeof Sidebar>) {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const { value: sidebarIsOpen, setValue: toggleSidebar } = useLocalStorage(`left-sidebar-state`, false);
	const closeMobileSidebar = () => isMobile && toggleSidebar(!sidebarIsOpen);
	const { account, organization } = useLayoutData();

	//
	//
	// CONSOLE SIDEBAR
	//
	//
	if (pathname.includes("/admin/console"))
		return (
			<Sidebar
				className={cn("max-h-[calc(100dvh-var(--header-height))] bg-sidebar")}
				{...props}
				collapsible={"icon"}
				side="left"
			>
				<SidebarHeader>
					<SidebarMenu>
						{!isOpen && <SidebarToggle sidebar name="left-sidebar" />}
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === "/admin/console"}>
								<Link href={"/admin/console"} prefetch={false} onClick={closeMobileSidebar}>
									<IconShield /> <span>Admin Console</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Manage</SidebarGroupLabel>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild>
									<Link href={""} prefetch={false} onClick={closeMobileSidebar}>
										<IconUsers />
										<span>Users</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === "/admin"}>
								<Link href={"/admin"} prefetch={false} onClick={closeMobileSidebar}>
									<IconArrowBack /> <span>Exit</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<UserDropdown />
					</SidebarMenu>
				</SidebarFooter>
			</Sidebar>
		);

	//
	//
	// DEFAULT SIDEBAR
	//
	//

	return (
		<Sidebar
			className={cn("max-h-[calc(100dvh-var(--header-height))] bg-sidebar")}
			{...props}
			collapsible={"icon"}
			side="left"
		>
			<SidebarHeader>
				{/* <SidebarMenu> */}
				{/* {!isOpen && <SidebarToggle sidebar name="left-sidebar" />} */}
				{/* mapped items */}
				{heading.map((section) => (
					<SidebarMenu key={section.title}>
						{section.items.map((item) => {
							const isActive = pathname === item.url;
							const IconComponent = isActive && item.activeIcon ? item.activeIcon : item.icon;

							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild isActive={isActive}>
										<Link href={item.url} prefetch={false} onClick={closeMobileSidebar}>
											{IconComponent && <IconComponent size={16} />}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				))}
				{/* end */}
				{/* </SidebarMenu> */}
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
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton asChild isActive={isActive}>
											<Link href={item.url} prefetch={false} onClick={closeMobileSidebar}>
												{IconComponent && <IconComponent size={16} />}
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroup>
				))}

				{/* Organizations Section */}
				{organization && <OrgSection organization={organization} closeMobileSidebar={closeMobileSidebar} />}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					{account.role === "admin" && (
						<SidebarMenuItem>
							<SidebarMenuButton asChild isActive={pathname === "/admin/console"}>
								<Link href={"/admin/console"} prefetch={false} onClick={closeMobileSidebar}>
									<IconShield /> <span>Admin Console</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)}
					<UserDropdown />
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

export function LeftSidebarProvider() {
	const isMobile = useIsMobile();
	const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);

	const defaultSidebarState = isMobile ? false : isOpen;

	return (
		<SidebarProvider name="left-sidebar" defaultOpen={defaultSidebarState} className="w-fit!">
			<LeftSidebar isOpen={isOpen} />
		</SidebarProvider>
	);
}

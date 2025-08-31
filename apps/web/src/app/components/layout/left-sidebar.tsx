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
import { Command } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/app/lib/routemap";
import UserDropdown from "./user-dropdown";

interface Props {
	isOpen: boolean;
}
export function LeftSidebar({ isOpen, ...props }: Props & React.ComponentProps<typeof Sidebar>) {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const { value: sidebarIsOpen, setValue: toggleSidebar } = useLocalStorage(`left-sidebar-state`, false);
	const closeMobileSidebar = () => isMobile && toggleSidebar(!sidebarIsOpen);

	return (
		<Sidebar
			className={cn("max-h-[calc(100dvh-var(--header-height))]  bg-sidebar")}
			{...props}
			collapsible={"icon"}
			side="left"
		>
			<SidebarHeader>
				<SidebarMenu>
					{!isOpen && <SidebarToggle sidebar name="left-sidebar" />}
					<SidebarMenuItem>
						<SidebarMenuButton>
							<Command /> <span>Test asd asd asd asd a</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				{navigation.map((section) => (
					<SidebarGroup key={section.title}>
						<SidebarGroupLabel>{section.title}</SidebarGroupLabel>
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
			</SidebarContent>
			<SidebarFooter>
				<UserDropdown />
			</SidebarFooter>
		</Sidebar>
	);
}

export function LeftSidebarProvider() {
	const { value: isOpen } = useLocalStorage("left-sidebar-state", false);

	return (
		<SidebarProvider name="left-sidebar" defaultOpen={isOpen} className="w-fit!">
			<LeftSidebar isOpen={isOpen} />
		</SidebarProvider>
	);
}

"use client";
import { Button } from "@repo/ui/components/button";
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
} from "@repo/ui/components/custom-sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { Command, SidebarIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/app/lib/routemap";
import { useDynamicSidebar } from "@/app/lib/use-dynamic-sidebar";

interface Props {
	isOpen: boolean;
}
export function LeftSidebar({ isOpen, ...props }: Props & React.ComponentProps<typeof Sidebar>) {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const { toggleSidebar } = useDynamicSidebar([`left-sidebar-state`]);
	const closeMobileSidebar = () => isMobile && toggleSidebar();

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
			<SidebarFooter>{/* <NavUser user={data.user} /> */}t</SidebarFooter>
		</Sidebar>
	);
}

export function LeftSidebarProvider() {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const { isOpen } = useDynamicSidebar(["left-sidebar-state"]);
	return (
		<SidebarProvider
			name="left-sidebar"
			// defaultOpen={isMobile ? false : isOpen}
			defaultOpen
			className="w-fit!"
		>
			<LeftSidebar isOpen={isOpen} />
		</SidebarProvider>
	);
}

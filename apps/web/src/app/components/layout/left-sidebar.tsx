"use client";
import { Button } from "@repo/ui/components/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@repo/ui/components/custom-sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { cn } from "@repo/ui/lib/utils";
import {
	BookOpen,
	Bot,
	Command,
	Frame,
	LifeBuoy,
	PieChart,
	Send,
	Settings2,
	SidebarIcon,
	SquareTerminal,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useDynamicSidebar } from "@/app/lib/use-dynamic-sidebar";

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	navMain: [
		{
			title: "Playground",
			url: "#",
			icon: SquareTerminal,
			isActive: true,
			items: [
				{
					title: "History",
					url: "#",
				},
				{
					title: "Starred",
					url: "#",
				},
				{
					title: "Settings",
					url: "#",
				},
			],
		},
		{
			title: "Models",
			url: "#",
			icon: Bot,
			items: [
				{
					title: "Genesis",
					url: "#",
				},
				{
					title: "Explorer",
					url: "#",
				},
				{
					title: "Quantum",
					url: "#",
				},
			],
		},
		{
			title: "Documentation",
			url: "#",
			icon: BookOpen,
			items: [
				{
					title: "Introduction",
					url: "#",
				},
				{
					title: "Get Started",
					url: "#",
				},
				{
					title: "Tutorials",
					url: "#",
				},
				{
					title: "Changelog",
					url: "#",
				},
			],
		},
		{
			title: "Settings",
			url: "#",
			icon: Settings2,
			items: [
				{
					title: "General",
					url: "#",
				},
				{
					title: "Team",
					url: "#",
				},
				{
					title: "Billing",
					url: "#",
				},
				{
					title: "Limits",
					url: "#",
				},
			],
		},
	],
	navSecondary: [
		{
			title: "Support",
			url: "#",
			icon: LifeBuoy,
		},
		{
			title: "Feedback",
			url: "#",
			icon: Send,
		},
	],
	projects: [
		{
			name: "Design Engineering",
			url: "#",
			icon: Frame,
		},
		{
			name: "Sales & Marketing",
			url: "#",
			icon: PieChart,
		},
		{
			name: "Travel",
			url: "#",
			icon: Map,
		},
	],
};

export function LeftSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const isMobile = useIsMobile();
	const pathname = usePathname();
	return (
		<Sidebar
			className="max-h-[calc(100dvh-var(--header-height))]"
			{...props}
			collapsible={isMobile === true ? "none" : "icon"}
			side="left"
		>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<Command /> <span>Test asd asd asd asd a</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton>
								<Command /> <span>Test asd asd asd asd a</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
				{/* <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
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
		<SidebarProvider name="left-sidebar" defaultOpen={isMobile ? false : isOpen} className="w-fit!">
			<LeftSidebar />
		</SidebarProvider>
	);
}

export function LeftSidebarToggle() {
	const { isOpen: sidebarIsOpen, toggleSidebar: toggleSettingsSidebar } = useDynamicSidebar(["left-sidebar-state"]);
	if (sidebarIsOpen) {
		return null;
	}
	return (
		<Button variant={"ghost"} onClick={() => toggleSettingsSidebar()} size={"icon"}>
			<SidebarIcon />
		</Button>
	);
}

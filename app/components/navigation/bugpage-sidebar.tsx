import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
} from "~/components/ui/sidebar";

export function BugPageSidebar() {
	return (
		<Sidebar
			className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
			side="right"
		>
			<SidebarContent>
				<SidebarHeader>Bug Details</SidebarHeader>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuButton>Bug Description</SidebarMenuButton>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

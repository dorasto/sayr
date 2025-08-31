"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@repo/ui/components/custom-sidebar-localstorage";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconPencil, IconUsers } from "@tabler/icons-react";
import { Folder, Forward, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Organization {
	name: string;
	logo?: string | null;
	slug: string;
}

interface OrgSectionProps {
	organization: Organization;
	closeMobileSidebar: () => void;
}

export default function OrgSection({ organization, closeMobileSidebar }: OrgSectionProps) {
	const isMobile = useIsMobile();
	const pathname = usePathname();

	return (
		<SidebarGroup className="group/org">
			<SidebarGroupLabel className="gap-2">
				<Avatar className="h-4 w-4 rounded-md">
					<AvatarImage src={organization.logo || ""} alt={organization.name} />
					<AvatarFallback className="rounded-md uppercase text-xs">
						<IconUsers className="h-4 w-4" />
					</AvatarFallback>
				</Avatar>{" "}
				{organization.name}
			</SidebarGroupLabel>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<SidebarGroupAction className="text-sidebar-foreground/0  group-hover/org:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all">
						<MoreHorizontal />
						<span className="sr-only">More</span>
					</SidebarGroupAction>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-48 rounded-lg"
					side={isMobile ? "bottom" : "right"}
					align={isMobile ? "end" : "start"}
				>
					<DropdownMenuItem>
						<IconPencil className="text-muted-foreground" />
						<span>Update</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Forward className="text-muted-foreground" />
						<span>Share Project</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<Trash2 className="text-muted-foreground" />
						<span>Delete Project</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton asChild isActive={pathname.includes(`/org/${organization.slug}`)}>
						<Link href={`admin/org/${organization.slug}`} prefetch={false} onClick={closeMobileSidebar}>
							<Avatar className="h-4 w-4 rounded-md">
								<AvatarImage src={organization.logo || ""} alt={organization.name} />
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<span>{organization.name}</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	);
}

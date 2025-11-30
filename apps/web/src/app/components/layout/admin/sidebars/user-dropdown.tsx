"use client";

import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub } from "@repo/ui/components/doras-ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconChevronDown, IconShield, IconUserCog } from "@tabler/icons-react";
import { BadgeCheck, Bell, ChevronsUpDown, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { UserUpdate } from "@/app/components/admin/user/update";

export default function UserDropdown() {
	const { account } = useLayoutData();
	const isMobile = useIsMobile();
	const [isUserUpdateOpen, setIsUserUpdateOpen] = useState(false);
	return (
		<>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							icon={
								<Avatar className="h-4 w-4 rounded-lg">
									<AvatarImage src={account.image || ""} alt={account.name} />
									<AvatarFallback className="rounded-lg uppercase">{account.name.slice(0, 2)}</AvatarFallback>
								</Avatar>
							}
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
							tooltip={"Your account"}
						>
							<div className="flex items-center justify-between">
								<span className="truncate font-medium">{account.name}</span>
								<ChevronsUpDown className="ml-auto size-4 shrink-0" />
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg z-[999]"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={account.image || ""} alt={account.name} />
									<AvatarFallback className="rounded-lg uppercase">{account.name.slice(0, 2)}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="line-clamp-1 font-medium">{account.name}</span>

									<span className="truncate text-xs">{account.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<Link href={"/admin/settings"} className="w-full">
								<DropdownMenuItem>
									<IconUserCog />
									Account settings
								</DropdownMenuItem>
							</Link>
						</DropdownMenuGroup>
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<CreditCard />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Bell />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => {
								await authClient.signOut();
								console.log("User signed out successfully.");
								window.location.reload();
							}}
						>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
			<UserUpdate isOpen={isUserUpdateOpen} onOpenChange={setIsUserUpdateOpen} />
		</>
	);
}

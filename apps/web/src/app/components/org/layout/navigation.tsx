"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@repo/ui/components/navigation-menu";
import { IconUsers } from "@tabler/icons-react";
import type { Organization } from "better-auth/plugins";

interface NavigationProps {
	organization: Organization;
}
export default function Navigation({ organization }: NavigationProps) {
	return (
		// <nav className="bg-sidebar border-b border-b-sidebar-border flex items-center gap-3 h-[var(--header-height)] px-3">
		// 	<div className="flex items-center gap-1">
		// 		<Avatar className="h-8 w-8 rounded-md">
		// 			<AvatarImage src={organization.logo || ""} alt={organization.name} />
		// 			<AvatarFallback className="rounded-md uppercase text-xs">
		// 				<IconUsers className="h-8 w-8" />
		// 			</AvatarFallback>
		// 		</Avatar>
		// 		{organization.name}
		// 	</div>
		// 	<NavigationMenu>
		// 		<NavigationMenuList>
		// 			<NavigationMenuItem>
		// 				<NavigationMenuTrigger>Item One</NavigationMenuTrigger>
		// 				<NavigationMenuContent>
		// 					<NavigationMenuLink>Link</NavigationMenuLink>
		// 				</NavigationMenuContent>
		// 			</NavigationMenuItem>
		// 		</NavigationMenuList>
		// 	</NavigationMenu>
		// </nav>
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center border-b">
			<div className="flex  w-full items-center gap-2 p-1">
				<div className="flex items-center gap-1 font-bold">
					<Button variant={"ghost"} className="justify-start px-2">
						<Avatar className="h-8 w-8 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<TasqIcon className="size-8! transition-all" />
							</AvatarFallback>
						</Avatar>

						<span className="text-inherit font-bold text-lg">{organization.name}</span>
					</Button>
				</div>
				<div className="flex flex-1 max-w-44 mx-auto">
					<Input />
				</div>
				<div className="flex items-center gap-1 ml-auto">
					<Button>Sign in</Button>
					{/* <AdminCommand />
					<ThemeToggle /> */}
				</div>
			</div>
		</header>
	);
}

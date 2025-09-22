"use client";

import { Button } from "@repo/ui/components/button";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@repo/ui/components/navigation-menu";
import LoginDialog from "../auth/login";

export default function Navigation() {
	return (
		<nav className="bg-sidebar border-b border-b-sidebar-border flex items-center gap-3 h-[var(--header-height)]">
			<NavigationMenu className="w-full">
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuTrigger>Item One</NavigationMenuTrigger>
						<NavigationMenuContent>
							<NavigationMenuLink>Link</NavigationMenuLink>
						</NavigationMenuContent>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
			<LoginDialog
				trigger={
					<Button variant={"accent"} className="ml-auto">
						Login
					</Button>
				}
			/>
		</nav>
	);
}

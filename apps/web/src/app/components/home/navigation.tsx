"use client";

import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@repo/ui/components/navigation-menu";

export default function Navigation() {
	return (
		<nav className="bg-sidebar border-b border-b-sidebar-border flex items-center gap-3 h-[var(--header-height)]">
			<NavigationMenu>
				<NavigationMenuList>
					<NavigationMenuItem>
						<NavigationMenuTrigger>Item One</NavigationMenuTrigger>
						<NavigationMenuContent>
							<NavigationMenuLink>Link</NavigationMenuLink>
						</NavigationMenuContent>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
		</nav>
	);
}

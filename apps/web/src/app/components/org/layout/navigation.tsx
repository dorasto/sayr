"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { SearchIcon } from "lucide-react";
import { useLayoutPublicDataOrganization } from "@/app/org/[slug]/Context";

export default function Navigation() {
	const { organization } = useLayoutPublicDataOrganization();
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
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center rounded-b-2xl">
			<div className="flex w-full justify-between items-center gap-2 p-1">
				<div className="flex-1 items-center gap-1 font-bold">
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
				<div className="grow max-sm:hidden">
					{/* Search form */}
					<div className="relative mx-auto w-full max-w-xs">
						<Input id={"search"} className="peer h-8 px-8" placeholder="Search..." type="search" />
						<div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 peer-disabled:opacity-50">
							<SearchIcon size={16} />
						</div>
					</div>
				</div>
				{/* <div className="flex flex-1 max-w-44 mx-auto">
					<Input />
				</div> */}
				<div className="flex flex-1 items-center justify-end gap-2">
					<Button>Sign in</Button>
					{/* <AdminCommand />
					<ThemeToggle /> */}
				</div>
			</div>
		</header>
	);
}

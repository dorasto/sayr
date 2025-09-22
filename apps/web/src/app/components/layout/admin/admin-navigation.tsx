"use client";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { SidebarToggle } from "@repo/ui/components/custom-sidebar-localstorage";
import { Separator } from "@repo/ui/components/separator";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { ThemeToggle } from "../../theme-toggle";
import AdminCommand from "./admin-command";

export default function AdminNavigation() {
	const { value: sidebarIsOpen } = useLocalStorage(`left-sidebar-state`, false);
	const isMobile = useIsMobile();

	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center">
			<div className="flex  w-full items-center gap-2 p-1">
				<div className="flex items-center gap-1 font-bold">
					{!sidebarIsOpen && !isMobile && (
						<>
							<SidebarToggle name="left-sidebar" />
							<Separator orientation="vertical" />
						</>
					)}
					{isMobile && (
						<>
							<SidebarToggle name="left-sidebar" />
							<Separator orientation="vertical" />
						</>
					)}
					<Button
						variant={"ghost"}
						className="justify-start pl-0 font-bold gap-1 text-muted-foreground [&_svg]:text-primary h-9 hover:bg-primary hover:[&_svg]:text-primary-foreground hover:text-primary-foreground transition-all"
					>
						<TasqIcon className="not-dark:hidden size-8! transition-all" />
						<TasqIcon className="dark:hidden size-8! transition-all" />
						<span className="text-inherit">sayr.io</span>
					</Button>
				</div>

				<div className="flex items-center gap-1 ml-auto">
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

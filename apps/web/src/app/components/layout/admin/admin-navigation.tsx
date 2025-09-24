"use client";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { SidebarToggle } from "@repo/ui/components/custom-sidebar-localstorage";
import { Separator } from "@repo/ui/components/separator";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconPlus } from "@tabler/icons-react";
import AdminCommand from "./admin-command";

export default function AdminNavigation() {
	const { value: sidebarIsOpen } = useLocalStorage(`left-sidebar-state`, false);
	const isMobile = useIsMobile();

	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center">
			<div className="flex w-full items-center gap-2 p-1 pr-4">
				<div
					className={cn("flex items-center gap-1 font-bold  shrink-0", sidebarIsOpen && !isMobile && "w-[16rem]")}
				>
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
				{/* FEED CONTENT WHEN ON PROJECT PAGE */}
				{/* EXAMPLE OF WHAT WE CAN FEED */}
				<div className="flex items-center w-full">
					<Button variant={"accent"} className="h-9">
						<IconPlus />
						<span className="text-inherit">New task</span>
					</Button>
				</div>
				<div className="flex items-center gap-1 ml-auto shrink-0">
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

"use client";
import { SidebarToggle } from "@repo/ui/components/custom-sidebar-localstorage";
import { Separator } from "@repo/ui/components/separator";

export default function AdminNavigation() {
	return (
		<header className="bg-sidebar sticky top-0 z-50 flex w-full items-center border-b">
			<div className="flex h-(--header-height) w-full items-center gap-2 px-4">
				<SidebarToggle name="left-sidebar" />
				<Separator orientation="vertical" className="mr-2 h-4" />
			</div>
		</header>
	);
}

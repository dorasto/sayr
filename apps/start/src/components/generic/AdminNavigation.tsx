"use client";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { Link, MatchRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";

// import { StatusBar } from "@/app/components/admin/global/status";

import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import { IconArrowLeft } from "@tabler/icons-react";
import { sidebarStore } from "@/lib/sidebar/sidebar-store";
import SidebarSection from "../admin/sidebars/SidebarSection";
import AdminCommand from "./AdminCommand";
// import AdminCommand from "../admin-command";
// import MinePage from "./MinePage";
// import OrganizationPage from "./OrganizationPage";
// import SidebarSection from "./SidebarSection";
// import TaskPage from "./TaskPage";
// import TasksPage from "./TasksPage";
import { StatusBar } from "./status";
import TaskNavigationInfo from "./TaskNavigationInfo";

export default function AdminNavigation() {
	const primarySidebar = useStore(
		sidebarStore,
		(state) => state.sidebars["primary-sidebar"],
	);
	const isSidebarOpen = primarySidebar?.open ?? true;
	const isMobile = useIsMobile();
	// const { isOrgPage, isTaskPage, isMinePage, isTasksPage } = useAdminRoute();
	console.log("AdminNavigation location:", location);
	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center">
			<div className="flex w-full items-center gap-2 p-1 pr-4">
				<div
					className={cn(
						"flex items-center gap-1 font-bold shrink-0",
						isSidebarOpen && !isMobile && "w-[16rem]",
					)}
				>
					<SidebarSection sidebarIsOpen={isSidebarOpen} isMobile={isMobile} />
				</div>

				<div className="flex items-center w-full gap-2">
					<MatchRoute to="/admin/$orgId/tasks/$taskShortId">
						<div className="flex items-center gap-2">
							<Link to=".." search={(prev) => prev} className="">
								<Button
									variant={"ghost"}
									className="w-fit text-xs p-1 h-auto bg-accent md:bg-transparent rounded-lg"
									size={"sm"}
								>
									<IconArrowLeft className="size-3!" />
									<span className="">Back</span>
								</Button>
							</Link>
							<Separator orientation="vertical" className="h-3" />
							<TaskNavigationInfo />
						</div>
					</MatchRoute>
				</div>

				<div className="flex items-center gap-1 ml-auto">
					<StatusBar />
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

"use client";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { useStore } from "@tanstack/react-store";
import { StatusBar } from "@/app/components/admin/global/status";
import { sidebarStore } from "@/app/lib/sidebar/sidebar-store";
import AdminCommand from "../admin-command";
import MinePage from "./MinePage";
import OrganizationPage from "./OrganizationPage";
import SidebarSection from "./SidebarSection";
import TaskPage from "./TaskPage";
import TasksPage from "./TasksPage";
import { useAdminRoute } from "./useAdminRoute";

export default function AdminNavigation() {
	const primarySidebar = useStore(sidebarStore, (state) => state.sidebars["primary-sidebar"]);
	const isSidebarOpen = primarySidebar?.open ?? true;
	const isMobile = useIsMobile();
	const { isOrgPage, isTaskPage, isMinePage, isTasksPage } = useAdminRoute();

	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center">
			<div className="flex w-full items-center gap-2 p-1 pr-4">
				<div
					className={cn("flex items-center gap-1 font-bold shrink-0", isSidebarOpen && !isMobile && "w-[16rem]")}
				>
					<SidebarSection sidebarIsOpen={isSidebarOpen} isMobile={isMobile} />
				</div>

				<div className="flex items-center w-full gap-2">
					{/* {isTaskPage ? (
						<>
							<TaskPage />
							<div className="ml-auto">
								<StatusBar />
							</div>
						</>
					) : ( */}
					{isTasksPage && <TasksPage />}
					{isTaskPage && <TaskPage />}
					{isOrgPage && <OrganizationPage />}
					{isMinePage && <MinePage />}

					{/* )} */}
				</div>

				<div className="flex items-center gap-1 ml-auto">
					<StatusBar />
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

"use client";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import useLocalStorage from "@repo/ui/hooks/useLocalStorage.ts";
import { cn } from "@repo/ui/lib/utils";
import { StatusBar } from "@/app/components/admin/global/status";
import AdminCommand from "../admin-command";
import OrganizationPage from "./OrganizationPage";
import ProjectPage from "./ProjectPage";
import SidebarSection from "./SidebarSection";
import TaskPage from "./TaskPage";
import { useAdminRoute } from "./useAdminRoute";

export default function AdminNavigation() {
	const { value: sidebarIsOpen } = useLocalStorage("left-sidebar-state", false);
	const isMobile = useIsMobile();
	const { isOrgPage, isProjectPage, isTaskPage } = useAdminRoute();

	return (
		<header className="bg-sidebar h-(--header-height) sticky top-0 z-50 flex w-full items-center">
			<div className="flex w-full items-center gap-2 p-1 pr-4">
				<div
					className={cn("flex items-center gap-1 font-bold shrink-0", sidebarIsOpen && !isMobile && "w-[16rem]")}
				>
					<SidebarSection sidebarIsOpen={sidebarIsOpen} isMobile={isMobile} />
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
					{isTaskPage && <TaskPage />}
					{isOrgPage && <OrganizationPage />}
					{isProjectPage && <ProjectPage />}
					<StatusBar />

					{/* )} */}
				</div>

				<div className="flex items-center gap-1 ml-auto">
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

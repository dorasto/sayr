"use client";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useMatch } from "@tanstack/react-router";

import { SidebarTrigger } from "@repo/ui/components/doras-ui/sidebar";
import AdminCommand from "./AdminCommand";
import SettingsNavigationInfo from "./SettingsNavigationInfo";
import { StatusBar } from "./status";
import TaskNavigationInfo from "./TaskNavigationInfo";
import TasksPageNavigationInfo from "./TasksPageNavigationInfo";
import ReleaseNavigationInfo from "../releases/ReleaseNavigationInfo";

export default function AdminNavigation() {
	const isMobile = useIsMobile();

	// Use useMatch to determine which route we're on
	const tasksMatch = useMatch({
		from: "/(admin)/$orgId/tasks",
		shouldThrow: false,
	});
	const taskDetailMatch = useMatch({
		from: "/(admin)/$orgId/tasks/$taskShortId",
		shouldThrow: false,
	});
	const settingsMatch = useMatch({
		from: "/(admin)/settings",
		shouldThrow: false,
	});
	const releaseDetailMatch = useMatch({
		from: "/(admin)/$orgId/releases/$releaseSlug",
		shouldThrow: false,
	});

	// Determine if we're on the tasks list page (not the detail page)
	const isTasksListPage = tasksMatch && !taskDetailMatch;
	const isTaskDetailPage = !!taskDetailMatch;
	const isSettingsPage = !!settingsMatch;
	const isReleaseDetailPage = !!releaseDetailMatch;

	return (
		<header className="bg-sidebar h-(--header-height) shrink-0 z-50 flex w-full items-center">
			<div className="flex w-full items-center gap-2 p-1 pr-4">
				{isMobile && (
					<div className="flex items-center px-1">
						<SidebarTrigger sidebarId="primary-sidebar" className="w-10 h-10" />
					</div>
				)}

				<div className="flex items-center w-full gap-2">
					{isTasksListPage && (
						<div className="flex items-center gap-2">
							<TasksPageNavigationInfo />
						</div>
					)}
					{isTaskDetailPage && (
						<div className="flex items-center gap-2">
							<TaskNavigationInfo />
						</div>
					)}
					{isSettingsPage && (
						<div className="flex items-center gap-2">
							<SettingsNavigationInfo />
						</div>
					)}
					{isReleaseDetailPage && (
						<div className="flex items-center gap-2 w-full">
							<ReleaseNavigationInfo />
						</div>
					)}
				</div>

				<div className="flex items-center gap-1 ml-auto">
					<StatusBar />
					<AdminCommand />
				</div>
			</div>
		</header>
	);
}

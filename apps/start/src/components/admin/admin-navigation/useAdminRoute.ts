import { useLocation } from "@tanstack/react-router";

export function useAdminRoute() {
	const location = useLocation();
	const pathname = location.pathname;

	const isMinePage = /^\/admin\/mine$/.test(pathname); // /admin/mine

	// /admin/console or anything nested like /admin/console/users
	const isStaffPage = /^\/admin\/console(?:$|\/)/.test(pathname);

	// /admin/settings or nested routes
	const isSettingsPage = /^\/admin\/settings(?:$|\/)/.test(pathname);

	// /admin/:orgId, but exclude known static routes
	const isOrgPage = /^\/admin\/[^/]+$/.test(pathname) && !/^\/admin\/(?:mine|console|settings)$/.test(pathname);

	// /admin/:orgId/tasks
	const isTasksPage =
		/^\/admin\/[^/]+\/tasks$/.test(pathname) && !/^\/admin\/(?:console|mine|settings)\b/.test(pathname);

	// /admin/:orgId/tasks/:taskId
	const isTaskPage =
		/^\/admin\/[^/]+\/tasks\/[^/]+$/.test(pathname) && !/^\/admin\/(?:console|mine|settings)\b/.test(pathname);

	return {
		isMinePage,
		isStaffPage,
		isSettingsPage,
		isOrgPage,
		isTasksPage,
		isTaskPage,
	};
}

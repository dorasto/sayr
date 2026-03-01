import { useLocation } from "@tanstack/react-router";

export function useAdminRoute() {
	const location = useLocation();
	const pathname = location.pathname;

	const isMinePage = /^\/mine$/.test(pathname); // /mine

	// /console or anything nested like /console/users
	const isStaffPage = /^\/console(?:$|\/)/.test(pathname);

	// /settings or nested routes
	const isSettingsPage = /^\/settings(?:$|\/)/.test(pathname);

	// /:orgId, but exclude known static routes
	const isOrgPage = /^\/[^/]+$/.test(pathname) && !/^\/(?:mine|console|settings)$/.test(pathname);

	// /:orgId/tasks
	const isTasksPage = /^\/[^/]+\/tasks$/.test(pathname) && !/^\/(?:console|mine|settings)\b/.test(pathname);

	// /:orgId/tasks/:taskId
	const isTaskPage = /^\/[^/]+\/tasks\/[^/]+$/.test(pathname) && !/^\/(?:console|mine|settings)\b/.test(pathname);

	// /:orgId/releases/:slug
	const isReleasePage = /^\/[^/]+\/releases\/[^/]+$/.test(pathname) && !/^\/(?:console|mine|settings)\b/.test(pathname);

	return {
		isMinePage,
		isStaffPage,
		isSettingsPage,
		isOrgPage,
		isTasksPage,
		isTaskPage,
		isReleasePage,
	};
}

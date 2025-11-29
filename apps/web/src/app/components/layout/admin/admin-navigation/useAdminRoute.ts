import { usePathname } from "next/navigation";

/**
 * A custom React hook for determining which `/admin` route the user is currently viewing.
 *
 * This hook inspects the current pathname (via `next/navigation`) and provides
 * boolean flags for known administrative routes.
 *
 * Supported route types:
 * - `/admin/mine` → user's personal admin view
 * - `/admin/console` → internal staff console (excluded from org detection)
 * - `/admin/settings` → global admin settings
 * - `/admin/:orgId` → organization-level overview
 * - `/admin/:orgId/tasks` → organization task list
 * - `/admin/:orgId/tasks/:taskId` → specific task detail page
 *
 * The hook ensures that `/admin/console`, `/admin/mine`, and `/admin/settings`
 * do **not** overlap with `isOrgPage` or task-related flags.
 *
 * @returns An object containing the following flags:
 * - `isMinePage` – `true` if the route matches `/admin/mine`
 * - `isStaffPage` – `true` if the route matches `/admin/console` or its subpaths
 * - `isSettingsPage` – `true` if the route matches `/admin/settings` or its subpaths
 * - `isOrgPage` – `true` if the route matches `/admin/:orgId`
 * - `isTasksPage` – `true` if the route matches `/admin/:orgId/tasks`
 * - `isTaskPage` – `true` if the route matches `/admin/:orgId/tasks/:taskId`
 *
 * @example
 * ```tsx
 * import { useAdminRoute } from "@/components/admin-navigation/useAdminRoute";
 *
 * export default function AdminNavigationContent() {
 *   const {
 *     isMinePage,
 *     isStaffPage,
 *     isSettingsPage,
 *     isOrgPage,
 *     isTasksPage,
 *     isTaskPage,
 *   } = useAdminRoute();
 *
 *   if (isStaffPage) {
 *     return <StaffConsole />;
 *   }
 *
 *   if (isOrgPage) {
 *     return <OrganizationPage />;
 *   }
 *
 *   if (isTaskPage) {
 *     return <TaskPage />;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useAdminRoute() {
	const pathname = usePathname();

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

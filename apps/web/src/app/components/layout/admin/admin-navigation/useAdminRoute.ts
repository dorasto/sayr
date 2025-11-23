"use client";
import { usePathname } from "next/navigation";

/**
 * A custom React hook for determining which `/admin` route the user is on.
 *
 * This hook inspects the current pathname (from `next/navigation`) and
 * provides booleans for:
 * - Organization page: `/admin/:orgId`
 * - Task page: `/admin/:orgId/:projectId/task/:taskId`
 *
 * This is useful for conditionally rendering UI or fetching data depending
 * on what type of admin page is being viewed.
 *
 * @returns An object with the following flags:
 * - `isOrgPage` – `true` if the route matches `/admin/:orgId`
 * - `isTaskPage` – `true` if the route matches `/admin/:orgId/tasks/:taskId`
 *
 * @example
 * ```tsx
 * import { useAdminRoute } from "@/components/admin-navigation/useAdminRoute";
 *
 * export default function AdminNavigationContent() {
 *   const { isOrgPage, isProjectPage, isTaskPage } = useAdminRoute();
 *
 *   if (isOrgPage) {
 *     return <OrganizationPage />;
 *   }
 *
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
	const isOrgPage = /^\/admin\/[^/]+$/.test(pathname); // /admin/:orgId
	const isTasksPage = /^\/admin\/[^/]+\/tasks+$/.test(pathname); // /admin/:orgId/tasks
	const isTaskPage = /^\/admin\/[^/]+\/tasks\/[^/]+$/.test(pathname); // /admin/:orgId/tasks/:taskId
	const isSettingsPage = /^\/admin\/settings/.test(pathname); // /admin/settings

	return { isMinePage, isOrgPage, isTasksPage, isTaskPage, isSettingsPage };
}

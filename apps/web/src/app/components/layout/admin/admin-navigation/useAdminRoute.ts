"use client";
import { usePathname } from "next/navigation";

/**
 * A custom React hook for determining which `/admin` route the user is on.
 *
 * This hook inspects the current pathname (from `next/navigation`) and
 * provides booleans for:
 * - Organization page: `/admin/:orgId`
 * - Project page: `/admin/:orgId/:projectId`
 * - Task page: `/admin/:orgId/:projectId/task/:taskId`
 *
 * This is useful for conditionally rendering UI or fetching data depending
 * on what type of admin page is being viewed.
 *
 * @returns An object with the following flags:
 * - `isOrgPage` – `true` if the route matches `/admin/:orgId`
 * - `isProjectPage` – `true` if the route matches `/admin/:orgId/:projectId`
 * - `isTaskPage` – `true` if the route matches `/admin/:orgId/:projectId/task/:taskId`
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
 *   if (isProjectPage) {
 *     return <ProjectPage />;
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

	const isOrgPage = /^\/admin\/[^/]+$/.test(pathname); // /admin/:orgId
	const isProjectPage = /^\/admin\/[^/]+\/[^/]+$/.test(pathname); // /admin/:orgId/:projectId
	const isTaskPage = /^\/admin\/[^/]+\/[^/]+\/task\/[^/]+$/.test(pathname); // /admin/:orgId/:projectId/task/:taskId

	return { isOrgPage, isProjectPage, isTaskPage };
}

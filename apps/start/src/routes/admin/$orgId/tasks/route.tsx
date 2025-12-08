import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderOrganizationTasks } from "@/contexts/ContextOrgTasks";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";

export const Route = createFileRoute("/admin/$orgId/tasks")({
	loader: async ({ params }) =>
		await getAdminOrganizationTasks({
			data: {
				orgId: params.orgId,
			},
		}),
	// Prevent refetching when only search params change (e.g., ?task=4)
	// The task list doesn't depend on search params
	staleTime: 1000 * 60, // 1 minute
	component: OrgTasksLayout,
});

function OrgTasksLayout() {
	const { tasks } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTasks tasks={tasks}>
			<Outlet />
		</RootProviderOrganizationTasks>
	);
}

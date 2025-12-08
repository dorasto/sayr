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

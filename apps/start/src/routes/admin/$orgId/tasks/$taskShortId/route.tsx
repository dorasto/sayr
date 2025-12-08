import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderOrganizationTask } from "@/contexts/ContextOrgTask";
import { getAdminOrganizationTask } from "@/lib/serverFunctions/getAdminOrganizationTask";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId")({
	loader: async ({ params }) =>
		await getAdminOrganizationTask({
			data: {
				orgId: params.orgId,
				taskShortId: parseInt(params.taskShortId),
			},
		}),
	component: OrgTasksLayout,
});

function OrgTasksLayout() {
	const { task } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTask task={task}>
			<Outlet />
		</RootProviderOrganizationTask>
	);
}

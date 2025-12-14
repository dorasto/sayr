import { createFileRoute } from "@tanstack/react-router";
import OrganizationTaskIdPage from "@/components/pages/admin/orgid/tasks/taskId";
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
	staleTime: 1000 * 60,
	component: OrgTasksLayout,
});

function OrgTasksLayout() {
	const { task } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTask task={task}>
			<OrganizationTaskIdPage />
		</RootProviderOrganizationTask>
	);
}

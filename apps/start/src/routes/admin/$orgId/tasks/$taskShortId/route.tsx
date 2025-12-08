import type { schema } from "@repo/database";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderOrganizationTask } from "@/contexts/ContextOrgTask";
import { getAdminOrganizationTask } from "@/lib/serverFunctions/getAdminOrganizationTask";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId")({
	// @ts-expect-error - TanStack Start's type system is too strict for JSONB fields (description, blockNote)
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
	const { task } = Route.useLoaderData() as unknown as { task: schema.TaskWithLabels };

	return (
		<RootProviderOrganizationTask task={task}>
			<Outlet />
		</RootProviderOrganizationTask>
	);
}

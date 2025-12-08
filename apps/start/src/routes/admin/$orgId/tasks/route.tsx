import type { schema } from "@repo/database";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RootProviderOrganizationTasks } from "@/contexts/ContextOrgTasks";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";

export const Route = createFileRoute("/admin/$orgId/tasks")({
	// @ts-expect-error - TanStack Start's type system is too strict for JSONB fields (description, blockNote)
	loader: async ({ params }) =>
		await getAdminOrganizationTasks({
			data: {
				orgId: params.orgId,
			},
		}),
	component: OrgTasksLayout,
});

function OrgTasksLayout() {
    const { tasks } = Route.useLoaderData()  as unknown as { tasks: schema.TaskWithLabels[] };

	return (
		<RootProviderOrganizationTasks tasks={tasks}>
			<Outlet />
		</RootProviderOrganizationTasks>
	);
}

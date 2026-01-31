import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganizationTasks } from "@/contexts/ContextOrgTasks";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";

export const Route = createFileRoute("/(admin)/$orgId/tasks")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getAdminOrganizationTasks({
			data: {
				account: context.account,
				orgId: params.orgId,
			},
		});
	},
	// staleTime prevents refetching for this duration
	// Path params (orgId) automatically determine cache identity
	staleTime: 1000 * 60 * 5, // 5 minutes
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

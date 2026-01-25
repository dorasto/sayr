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
	// Prevent refetching when only search params change (e.g., ?task=4, ?view=xyz, ?filters=...)
	// The task list doesn't depend on search params - filtering is done client-side
	staleTime: 1000 * 60 * 5, // 5 minutes
	shouldRevalidate: ({ currentParams, nextParams }) => {
		// Only revalidate if the orgId changes, not when search params change
		return currentParams.orgId !== nextParams.orgId;
	},
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

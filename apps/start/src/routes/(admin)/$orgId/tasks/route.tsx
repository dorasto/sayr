import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganizationTasks } from "@/contexts/ContextOrgTasks";
import { getAdminOrganizationTasks } from "@/lib/serverFunctions/getAdminOrganizationTasks";
import { IconLoader2 } from "@tabler/icons-react";

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
	component: OrgTasksLayout,
	pendingComponent: OrgTasksLayoutPending,
});

function OrgTasksLayout() {
	const { tasks } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTasks tasks={tasks}>
			<Outlet />
		</RootProviderOrganizationTasks>
	);
}

function OrgTasksLayoutPending() {
	return (
		<div className="flex items-center justify-center h-full w-full">
			<IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
		</div>
	);
}

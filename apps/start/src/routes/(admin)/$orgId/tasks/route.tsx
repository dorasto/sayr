import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganizationTasks } from "@/contexts/ContextOrgTasks";
import { useTasksCommands } from "@/hooks/commands/useTasksCommands";
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
	// Prevent loader from re-running when only search params change (e.g., ?task=4, ?view=xyz, ?filters=...)
	// The task list doesn't depend on search params - filtering is done client-side
	shouldReload: false,
	component: OrgTasksLayout,
});

function OrgTasksLayout() {
	const { tasks } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTasks tasks={tasks}>
			<TasksCommandRegistrar />
			<Outlet />
		</RootProviderOrganizationTasks>
	);
}

/** Registers tasks-list-specific commands. Must be rendered inside RootProviderOrganizationTasks. */
function TasksCommandRegistrar() {
	useTasksCommands();
	return null;
}

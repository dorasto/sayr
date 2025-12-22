import { createFileRoute, redirect } from "@tanstack/react-router";
import OrganizationTaskIdPage from "@/components/pages/admin/orgid/tasks/taskId";
import { RootProviderOrganizationTask } from "@/contexts/ContextOrgTask";
import { getAdminOrganizationTask } from "@/lib/serverFunctions/getAdminOrganizationTask";
import { seo } from "@/seo";

export const Route = createFileRoute("/admin/$orgId/tasks/$taskShortId")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getAdminOrganizationTask({
			data: {
				account: context.account,
				orgId: params.orgId,
				taskShortId: parseInt(params.taskShortId),
			},
		});
	},
	staleTime: 1000 * 60,
	component: OrgTasksLayout,
        head: ({ loaderData }) => ({
            meta: seo({
                title: `#${
loaderData?.task.shortId
                } ${loaderData?.task.title}`,
            }),
        }),
});

function OrgTasksLayout() {
	const { task } = Route.useLoaderData();

	return (
		<RootProviderOrganizationTask task={task}>
			<OrganizationTaskIdPage />
		</RootProviderOrganizationTask>
	);
}

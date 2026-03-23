import { createFileRoute, redirect } from "@tanstack/react-router";
import OrganizationTaskIdPage from "@/components/pages/admin/orgid/tasks/taskId";
import { RootProviderOrganizationTask } from "@/contexts/ContextOrgTask";
import { useTaskCommands } from "@/hooks/commands/useTaskCommands";
import { getAdminOrganizationTask } from "@/lib/serverFunctions/getAdminOrganizationTask";
import { seo, getOgImageUrl } from "@/seo";

export const Route = createFileRoute("/(admin)/$orgId/tasks/$taskShortId")({
  loader: async ({ params, context }) => {
    if (!context.account) {
      throw redirect({ to: "/auth/login" });
    }
    return await getAdminOrganizationTask({
      data: {
        account: context.account,
        orgId: params.orgId,
        taskShortId: parseInt(params.taskShortId),
      },
    });
  },
  shouldReload: true,
  component: OrgTasksLayout,
  head: ({ loaderData }) => ({
    meta: seo({
      title: `${loaderData?.task.title}`,
      image: loaderData?.task
        ? getOgImageUrl({
          title: loaderData.task.title || undefined,
          subtitle: `#${loaderData.task.shortId}`,
          meta: loaderData.orgName || undefined,
          logo: loaderData.orgLogo || undefined,
        })
        : undefined,
    }),
  }),
});

function OrgTasksLayout() {
  const { task } = Route.useLoaderData();

  return (
    <RootProviderOrganizationTask task={task} organizationId={task.organizationId}>
      <TaskCommandRegistrar />
      <OrganizationTaskIdPage />
    </RootProviderOrganizationTask>
  );
}

/** Registers single-task-specific commands. Must be rendered inside RootProviderOrganizationTask. */
function TaskCommandRegistrar() {
  useTaskCommands();
  return null;
}

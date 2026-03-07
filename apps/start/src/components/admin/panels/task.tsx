import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { ensureCdnUrl } from "@repo/util";
import {
  IconCopy,
  IconGitBranch,
  IconLink,
  IconUsers,
} from "@tabler/icons-react";
import { useMatch } from "@tanstack/react-router";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTask } from "@/contexts/ContextOrgTask";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { useToastAction } from "@/lib/util";
import { TaskContentSideContent } from "@/components/tasks/task/task-content";
import { headlessToast } from "@repo/ui/components/headless-toast";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";

/**
 * Fixed header for the task detail panel, height-matched to PageHeader.Identity (h-11).
 * Shows org avatar + task short ID and title.
 */
export function TaskPanelHeader() {
  const { task } = useLayoutTask();
  const { organization } = useLayoutOrganization();

  return (
    <div className="flex items-center gap-2 w-full flex-1 min-w-0">
      <Avatar className="h-4 w-4 shrink-0">
        <AvatarImage
          src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
          alt={organization.name}
        />
        <AvatarFallback className="rounded-md uppercase text-[10px]">
          <IconUsers className="h-3 w-3" />
        </AvatarFallback>
      </Avatar>
      <span className="text-xs font-medium truncate">
        #{task.shortId} {task.title || "Untitled"}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <SimpleClipboard
          textToCopy={`https://${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
          variant={"primary"}
          className="h-6 p-1 w-fit bg-transparent"
          copyIcon={<IconLink />}
          tooltipText="Copy task URL"
          tooltipSide="bottom"
          onCopy={() =>
            headlessToast({
              title: `${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`,
              description: `Task URL copied`,
              icon: <IconCopy className="size-4" />,
            })
          }
        />
        <SimpleClipboard
          textToCopy={`${organization.shortId}-${task.shortId}`}
          variant={"primary"}
          className="h-6 p-1 w-fit bg-transparent"
          copyIcon={<IconGitBranch />}
          tooltipText="Copy branch name"
          tooltipSide="bottom"
          onCopy={() =>
            headlessToast({
              title: `${organization.shortId}-${task.shortId}`,
              description: `Create a branch with this name to sync it with this task`,
              icon: <IconCopy className="size-4" />,
            })
          }
        />
      </div>
    </div>
  );
}

/**
 * Interactive panel content that renders the full TaskContentSideContent.
 * Pulls all required data from context hooks so it stays in sync.
 */
export function TaskPanelContent() {
  const { task, setTask } = useLayoutTask();
  const { organization, labels, categories, releases } =
    useLayoutOrganization();
  const { tasks, setTasks } = useLayoutTasks();
  const { runWithToast } = useToastAction();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const orgMatch = useMatch({ from: "/(admin)/$orgId", shouldThrow: false });
  const permissions = orgMatch?.context?.permissions;
  const canCreateLabel =
    permissions?.admin?.administrator === true ||
    permissions?.content?.manageLabels === true;

  const availableUsers =
    organization?.members.map((member) => member.user) || [];

  return (
    <TaskContentSideContent
      task={task}
      labels={labels}
      tasks={tasks}
      setTasks={setTasks}
      setSelectedTask={(t) => t && setTask(t)}
      availableUsers={availableUsers}
      wsClientId={wsClientId}
      runWithToast={runWithToast}
      categories={categories}
      releases={releases}
      organization={organization}
      canCreateLabel={canCreateLabel}
    />
  );
}

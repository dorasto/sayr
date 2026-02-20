import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
	IconBrandGithub,
	IconExternalLink,
	IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import TaskFieldToolbar from "@/components/tasks/shared/task-field-toolbar";
import { TaskVoting } from "@/components/tasks";
import { TaskEditableHeader } from "@/components/tasks/task/editable-header";
import GlobalTimeline from "@/components/tasks/task/timeline/root";

interface MyTaskDetailProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
  labels: schema.labelType[];
  categories: schema.categoryType[];
  releases?: schema.releaseType[];
}

export function MyTaskDetail({
  task,
  tasks,
  setTasks,
  setSelectedTask,
  labels,
  categories,
  releases = [],
}: MyTaskDetailProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);

  // Set mentionContext so the Editor's useMentionUsers hook can fetch org members
  useEffect(() => {
    if (task.organizationId) {
      setMentionContext({ orgId: task.organizationId });
    }
  }, [task.organizationId, setMentionContext]);

  // Get labels and categories for this task's organization
  const orgLabels = labels.filter(
    (l) => l.organizationId === task.organizationId,
  );
  const orgCategories = categories.filter(
    (c) => c.organizationId === task.organizationId,
  );
  const orgReleases = releases.filter(
    (r) => r.organizationId === task.organizationId,
  );

  // Use existing assignees as available users for non-mention components (assignee picker, etc.)
  // The Editor now fetches full org members internally via useMentionUsers
  const availableUsers = (task.assignees || []) as unknown as schema.userType[];

  const fullUrl = `/${task.organizationId}/tasks/${task.shortId}`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 h-11 shrink-0 border-b overflow-x-auto">
        <TaskFieldToolbar
          task={task}
          variant="compact"
          useInternalLogic
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={orgCategories}
          releases={orgReleases}
          availableLabels={orgLabels}
          availableUsers={availableUsers}
          fields={{ release: false, visibility: false }}
        />
        <TaskVoting
          task={task}
          editable={true}
          organizationId={task.organizationId}
          wsClientId={wsClientId}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
        />
        {task.organization && (
          <Link to={fullUrl} className="inline-block ml-auto">
            <Button
              variant="primary"
              className="border-transparent h-7"
              size={"sm"}
            >
              <IconExternalLink className="size-3" />
              {task.organization.slug}/#{task.shortId}
            </Button>
          </Link>
        )}
        <SimpleClipboard
          textToCopy={`https://${task.organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
          variant="primary"
          className="h-7 p-1 w-fit bg-accent"
          copyIcon={<IconLink className="size-4" />}
          tooltipText="Copy task URL"
          tooltipSide="bottom"
        />
        {task.githubIssue && (
          <Link
            to={task.githubIssue?.issueUrl}
            target="_blank"
            className="shrink-0"
          >
            <Button
              variant="primary"
              className="h-[26px] p-1 w-fit bg-accent text-xs"
              tooltipText="View linked GitHub issue"
              tooltipSide="bottom"
            >
              <IconBrandGithub className="size-4" /> GitHub
            </Button>
          </Link>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <TaskEditableHeader
          task={task}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={categories}
          organization={task.organization}
          showContent="both"
        />
        <GlobalTimeline
          task={task}
          labels={orgLabels}
          availableUsers={availableUsers}
          categories={orgCategories}
          tasks={tasks}
          releases={orgReleases}
          organization={task.organization}
        />
      </div>
    </div>
  );
}

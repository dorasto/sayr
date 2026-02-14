import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import {
	IconBrandGithub,
	IconExternalLink,
	IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { updateLabelToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "@/components/tasks/shared/assignee";
import GlobalTaskCategory from "@/components/tasks/shared/category";
import GlobalTaskLabels from "@/components/tasks/shared/label";
import GlobalTaskPriority from "@/components/tasks/shared/priority";
import GlobalTaskStatus from "@/components/tasks/shared/status";
import GlobalTimeline from "@/components/tasks/task/timeline/root";
import { TaskVoting } from "@/components/tasks";
import { TaskEditableHeader } from "@/components/tasks/task/editable-header";

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
  const { runWithToast } = useToastAction();

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

  const debouncedUpdateLabels = useDebounceAsync(
    async (values: string[], wsClientId: string) => {
      const data = await runWithToast(
        "update-task-labels",
        {
          loading: {
            title: "Updating task...",
            description: "Updating your task... changes are already visible.",
          },
          success: {
            title: "Task saved",
            description: "Your changes have been saved successfully.",
          },
          error: {
            title: "Save failed",
            description:
              "Your changes are showing, but we couldn't save them to the server. Please try again.",
          },
        },
        () =>
          updateLabelToTaskAction(
            task.organizationId,
            task.id,
            values,
            wsClientId,
          ),
      );
      return data;
    },
    1500,
  );

  const fullUrl = `/${task.organizationId}/tasks/${task.shortId}`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 h-11 shrink-0 border-b overflow-x-auto">
        <GlobalTaskStatus
          task={task}
          editable={true}
          useInternalLogic={true}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          showLabel={false}
          showChevron={false}
          compact={true}
          className="bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary"
        />
        <GlobalTaskPriority
          className="bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary"
          showLabel={false}
          task={task}
          editable={true}
          showChevron={false}
          compact={true}
          onPriorityChange={async (value) => {
            const updatedTasks = tasks.map((t) =>
              t.id === task.id
                ? {
                    ...task,
                    priority: value as schema.TaskWithLabels["priority"],
                  }
                : t,
            );
            setTasks(updatedTasks);
            setSelectedTask({
              ...task,
              priority: value as schema.TaskWithLabels["priority"],
            });
            const data = await runWithToast(
              "update-task-priority",
              {
                loading: {
                  title: "Updating task...",
                  description:
                    "Updating your task... changes are already visible.",
                },
                success: {
                  title: "Task saved",
                  description: "Your changes have been saved successfully.",
                },
                error: {
                  title: "Save failed",
                  description:
                    "Your changes are showing, but we couldn't save them to the server. Please try again.",
                },
              },
              () =>
                updateTaskAction(
                  task.organizationId,
                  task.id,
                  { priority: value },
                  wsClientId,
                ),
            );
            if (data?.success && data.data) {
              const finalTasks = tasks.map((t) =>
                t.id === task.id && data.data ? data.data : t,
              );
              setTasks(finalTasks);
              if (task.id === data.data.id) {
                setSelectedTask(data.data);
                sendWindowMessage(
                  window,
                  {
                    type: "timeline-update",
                    payload: data.data.id,
                  },
                  "*",
                );
              }
            }
          }}
        />
        <GlobalTaskCategory
          className="bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary"
          showLabel={false}
          task={task}
          showChevron={false}
          editable={true}
          useInternalLogic={true}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={orgCategories}
          compact={true}
        />
        <GlobalTaskAssignees
          className="bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary"
          task={task}
          showChevron={false}
          editable={true}
          availableUsers={availableUsers}
          useInternalLogic={true}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          showLabel={false}
          compact={true}
        />
        <GlobalTaskLabels
          showLabel={false}
          task={task}
          editable={true}
          availableLabels={orgLabels}
          compact={true}
          onLabelsChange={async (values) => {
            const updatedTasks = tasks.map((t) =>
              t.id === task.id
                ? {
                    ...task,
                    labels: orgLabels.filter((label) =>
                      values.includes(label.id),
                    ),
                  }
                : t,
            );
            setTasks(updatedTasks);
            setSelectedTask({
              ...task,
              labels: orgLabels.filter((label) => values.includes(label.id)),
            });
            const data = await debouncedUpdateLabels(values, wsClientId);
            if (data?.success && data.data && !data.skipped) {
              const finalTasks = tasks.map((t) =>
                t.id === task.id && data.data ? data.data : t,
              );
              setTasks(finalTasks);
              if (task.id === data.data.id) {
                setSelectedTask(data.data);
                sendWindowMessage(
                  window,
                  {
                    type: "timeline-update",
                    payload: data.data.id,
                  },
                  "*",
                );
              }
            }
          }}
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

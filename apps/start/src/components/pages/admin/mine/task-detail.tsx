import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import {
  IconBrandGithub,
  IconExternalLink,
  IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateLabelToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "@/components/tasks/shared/assignee";
import GlobalTaskCategory from "@/components/tasks/shared/category";
import GlobalTaskLabels from "@/components/tasks/shared/label";
import GlobalTaskPriority from "@/components/tasks/shared/priority";
import GlobalTaskStatus from "@/components/tasks/shared/status";
import GlobalTimeline from "@/components/tasks/task/timeline/root";
import { Label } from "@repo/ui/components/label";
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
  const { runWithToast } = useToastAction();

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

  // Use existing assignees as available users (since we don't have full org member data)
  // Cast to userType - the components only use id, name, image anyway
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

  const urlParts = task.githubIssue?.issueUrl?.split("/");
  const [GitHubIssueOrg, GitHubIssueRepo] = [urlParts?.[3], urlParts?.[4]];
  const fullUrl = `/${task.organizationId}/tasks/${task.shortId}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex-1 min-w-0 inline-flex items-baseline w-2/3">
            <TaskEditableHeader
              task={task}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
              availableUsers={availableUsers}
              categories={categories}
              organization={task.organization}
              showContent="title"
            />
            {/*<Label variant={"heading"} className="text-3xl">
							{task.title || "Untitled"}
						</Label>*/}
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2 w-full shrink-0">
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
            <Link to={fullUrl} className="inline-block">
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
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <TaskEditableHeader
          task={task}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          availableUsers={availableUsers}
          categories={categories}
          organization={task.organization}
          showContent="description"
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

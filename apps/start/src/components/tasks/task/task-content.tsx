"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBrandGithub,
  IconExternalLink,
  IconLink,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { SubWrapper } from "@/components/generic/wrapper";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateLabelToTaskAction } from "@/lib/fetches/task";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import type { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "../shared/assignee";
import GlobalTaskLabels from "../shared/label";
import TaskFieldToolbar from "../shared/task-field-toolbar";
import GlobalTimeline from "./timeline/root";
import { Separator } from "@repo/ui/components/separator";
import { InlineLabel } from "../shared/inlinelabel";
import { TaskEditableHeader } from "./editable-header";

interface TaskContentSideContentProps {
  task: schema.TaskWithLabels;
  labels: schema.labelType[];
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
  availableUsers?: schema.userType[];
  wsClientId: string;
  runWithToast: typeof useToastAction extends () => { runWithToast: infer T }
  ? T
  : never;
  categories: schema.categoryType[];
  releases: schema.releaseType[];
  organization: schema.OrganizationWithMembers;
  /** If true, shows an inline "Create label" form when no labels match search */
  canCreateLabel?: boolean;
}

export function TaskContentSideContent({
  task,
  labels,
  tasks,
  setTasks,
  setSelectedTask,
  availableUsers = [],
  wsClientId,
  runWithToast,
  categories,
  releases = [],
  organization,
  canCreateLabel = false,
}: TaskContentSideContentProps) {
  const { setLabels } = useLayoutOrganization();
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
    1500, // debounce delay
  );
  const urlParts = task.githubIssue?.issueUrl?.split("/")
  const urlPartsPr = task.githubPullRequest?.prUrl?.split("/");
  const [GitHubIssueOrg, GitHubIssueRepo] = [urlParts?.[3], urlParts?.[4]];
  const [GitHubPrOrg, GitHubPrRepo] = [urlPartsPr?.[3], urlPartsPr?.[4]];
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="p-1 pt-3 flex flex-col gap-2 max-w-full md:max-w-1/2">
        <TaskFieldToolbar
          task={task}
          variant="sidebar"
          useInternalLogic
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={categories}
          releases={releases}
          availableLabels={labels}
          availableUsers={availableUsers}
          fields={{ labels: false, assignees: false, vote: true }}
        />
      </div>
      <div className="p-1 flex flex-col gap-2 max-w-full">
        <Tile
          className="md:w-full items-start p-0 flex-col gap-1"
          variant={"transparent"}
        >
          <TileHeader>
            <TileTitle asChild>
              <Label variant={"description"} className="text-xs">
                Assigned to
              </Label>
            </TileTitle>
          </TileHeader>
          <TileAction>
            <GlobalTaskAssignees
              className="bg-transparent p-1 h-auto"
              task={task}
              showChevron={false}
              editable={true}
              availableUsers={availableUsers}
              useInternalLogic={true}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
              showLabel={false}
            />
          </TileAction>
        </Tile>
      </div>
      <div className="p-1 flex flex-col gap-2 max-w-full">
        <Tile
          className="md:w-full items-start p-0 flex-col gap-1"
          variant={"transparent"}
        >
          <TileHeader>
            <TileTitle asChild>
              <Label variant={"description"} className="text-xs">
                Labels
              </Label>
            </TileTitle>
          </TileHeader>
          <TileAction>
            <GlobalTaskLabels
              showLabel={false}
              task={task}
              editable={true}
              availableLabels={labels}
              canCreateLabel={canCreateLabel}
              onLabelCreated={(newLabels) => {
                setLabels(newLabels);
              }}
              onLabelsChange={async (values) => {
                const updatedTasks = tasks.map((t) =>
                  t.id === task.id
                    ? {
                      ...task,
                      labels: labels.filter((label) =>
                        values.includes(label.id),
                      ),
                    }
                    : t,
                );
                setTasks(updatedTasks);
                if (task) {
                  setSelectedTask({
                    ...task,
                    labels: labels.filter((label) => values.includes(label.id)),
                  });
                }
                const data = await debouncedUpdateLabels(values, wsClientId);
                if (data?.success && data.data && !data.skipped) {
                  const finalTasks = tasks.map((t) =>
                    t.id === task.id && data.data ? data.data : t,
                  );
                  setTasks(finalTasks);
                  if (task && task.id === data.data.id) {
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
          </TileAction>
        </Tile>
      </div>

      <Separator />
      <div className="p-1 flex flex-col gap-2 max-w-full md:max-w-1/2">
        {task.githubIssue?.issueUrl && (
          <Link to={task.githubIssue?.issueUrl} target="_blank">
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center justify-center gap-1 ps-0 text-xs border rounded-lg border-transparent truncate group/link cursor-pointer w-fit relative bg-transparent p-1 h-auto",
              )}
            >
              {/*{GitHubIssueOrg}/{GitHubIssueRepo}/
                {task.githubIssue?.issueNumber}*/}
              <InlineLabel
                text={`${GitHubIssueOrg}/${GitHubIssueRepo}/${task.githubIssue?.issueNumber}`}
                icon={<IconBrandGithub className="size-3" />}
                className="cursor-pointer"
                textNode={
                  <div className="flex items-center gap-2">
                    <span className="truncate">{`${GitHubIssueOrg}/${GitHubIssueRepo}/${task.githubIssue?.issueNumber}`}</span>
                    <IconExternalLink className="size-3 opacity-0 group-hover/link:opacity-100 transition-all" />
                  </div>
                }
              />
            </Badge>
          </Link>
        )}
        {task.githubPullRequest?.prUrl && (
          <Link to={task.githubPullRequest.prUrl} target="_blank">
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-2 text-xs rounded-lg bg-transparent p-1 h-auto group/link"
              )}
            >
              <IconBrandGithub className="size-3" />

              <span className="truncate">
                PR #{GitHubPrOrg}/{GitHubPrRepo}/{task.githubPullRequest.prNumber}
              </span>

              {/* Status Indicator */}
              {task.githubPullRequest.merged ? (
                <span className="text-emerald-600 text-[10px] font-medium">
                  merged
                </span>
              ) : task.githubPullRequest.state === "closed" ? (
                <span className="text-muted-foreground text-[10px] font-medium">
                  closed
                </span>
              ) : (
                <span className="text-blue-600 text-[10px] font-medium">
                  open
                </span>
              )}

              <IconExternalLink className="size-3 opacity-0 group-hover/link:opacity-100 transition-all" />
            </Badge>
          </Link>
        )}
      </div>
    </div>
  );
}

export function TaskContentMobileContent({
  task,
  labels,
  tasks,
  setTasks,
  setSelectedTask,
  availableUsers = [],
  categories,
  organization,
  releases,
}: Omit<
  TaskContentSideContentProps,
  "wsClientId" | "runWithToast"
>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center flex-wrap gap-1 w-full overflow-x-auto py-1">
        <TaskFieldToolbar
          task={task}
          variant="compact"
          useInternalLogic
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={categories}
          releases={releases}
          availableLabels={labels}
          availableUsers={availableUsers}
          fields={{ vote: true }}
        />
        <Separator orientation="vertical" className="h-[26px]" />
        <SimpleClipboard
          textToCopy={`https://${organization?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
          variant={"primary"}
          className="h-[26px] p-1 w-fit bg-accent"
          copyIcon={<IconLink />}
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
  );
}

interface TaskContentMainProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setTask: (task: schema.TaskWithLabels) => void;
  labels: schema.labelType[];
  availableUsers?: schema.userType[];
  organization: schema.OrganizationWithMembers;
  categories: schema.categoryType[];
  releases: schema.releaseType[];
}

export function TaskContentMain({
  task,
  tasks,
  setTasks,
  setTask,
  labels,
  availableUsers = [],
  organization,
  categories,
  releases = [],
}: TaskContentMainProps) {
  // Wrapper function to match setSelectedTask signature
  const setSelectedTask = (t: schema.TaskWithLabels | null) => {
    if (t) setTask(t);
  };

  return (
    <div className="">
      <SubWrapper style="compact" className="max-w-6xl gap-3">
        {/* Editable Header with title and description */}
        <TaskEditableHeader
          task={task}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={categories}
          organization={organization}
        />

        <GlobalTimeline
          task={task}
          labels={labels}
          availableUsers={availableUsers}
          categories={categories}
          tasks={tasks}
          releases={releases}
        />
      </SubWrapper>
    </div>
  );
}



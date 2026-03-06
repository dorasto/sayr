import type { schema } from "@repo/database";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconLink } from "@tabler/icons-react";
import { SubWrapper } from "@/components/generic/wrapper";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateLabelToTaskAction } from "@/lib/fetches/task";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import type { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "../shared/assignee";
import GlobalTaskGithubIssue from "../shared/github-issue";
import GlobalTaskLabels from "../shared/label";
import TaskFieldToolbar from "../shared/task-field-toolbar";
import GlobalTimeline from "./timeline/root";
import { Separator } from "@repo/ui/components/separator";
import { TaskEditableHeader } from "./editable-header";
import {
  TaskParentSection,
  TaskSubtasksSection,
  TaskRelationsSection,
} from "./task-hierarchy-sections";
import { TaskContextBanner } from "./task-context-banner";

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
          fields={[
            "vote",
            "status",
            "priority",
            "category",
            "visibility",
            "release",
            "githubIssue",
            "githubPr",
          ]}
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
      <TaskParentSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        wsClientId={wsClientId}
        runWithToast={runWithToast}
      />
      <TaskSubtasksSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        wsClientId={wsClientId}
        runWithToast={runWithToast}
      />
      <TaskRelationsSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        wsClientId={wsClientId}
        runWithToast={runWithToast}
      />
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
}: Omit<TaskContentSideContentProps, "wsClientId" | "runWithToast">) {
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
          fields={[
            "status",
            "priority",
            { key: "labels", compact: true },
            { key: "assignees", compact: true },
            "category",
            "visibility",
            "release",
            "vote",
          ]}
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
        <GlobalTaskGithubIssue task={task} className="bg-accent" />
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
        <Separator />
        <TaskContextBanner
          task={task}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
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

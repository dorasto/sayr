import type { schema } from "@repo/database";
import {
  Tile,
  TileAction,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { IconExternalLink, IconLink, IconPlug } from "@tabler/icons-react";
import { SubWrapper } from "@/components/generic/wrapper";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import type { useToastAction } from "@/lib/util";
import GlobalTaskAssignees from "../shared/assignee";
import GlobalTaskGithubIssue from "../shared/github-issue";
import GlobalTaskLabels from "../shared/label";
import TaskFieldToolbar, {
  getTaskFieldPermissions,
} from "../shared/task-field-toolbar";
import GlobalTimeline from "./timeline/root";
import { Separator } from "@repo/ui/components/separator";
import { TaskEditableHeader } from "./editable-header";
import {
  TaskParentSection,
  TaskSubtasksSection,
  TaskRelationsSection,
} from "./task-hierarchy-sections";
import { TaskContextBanner } from "./task-context-banner";
import { useReadOnlyStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { InlineLabel } from "../shared";
import { getMatchedIntegrations } from "../shared/integration-registry";
import { cn } from "@/lib/utils";

interface TaskContentSideContentProps {
  task: schema.TaskWithLabels;
  labels: schema.labelType[];
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
  availableUsers?: schema.userType[];
  sseClientId: string;
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
  sseClientId,
  runWithToast,
  categories,
  releases = [],
  canCreateLabel = false,
}: TaskContentSideContentProps) {
  const { setLabels, permissions } = useLayoutOrganization();
  const { account } = useLayoutData();
  const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);
  const { value: activity }: any = useReadOnlyStateManagementKey([
    "timeline",
    "activity",
    task.id,
    task.organizationId,
  ]);
  const integrationActivities = activity?.filter(
    (e: any) => e.eventType === "integration",
  );
  const matchedIntegrations = getMatchedIntegrations(
    integrationActivities ?? [],
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="p-1 pt-3 flex flex-col gap-2 max-w-full md:max-w-1/2">
        <TaskFieldToolbar
          task={task}
          variant="sidebar"
          fieldPermissions={fieldPerms}
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
              editable={fieldPerms.assignees ?? true}
              availableUsers={availableUsers}
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
              editable={fieldPerms.labels ?? true}
              availableLabels={labels}
              canCreateLabel={canCreateLabel}
              onLabelCreated={(newLabels) => {
                setLabels(newLabels);
              }}
              tasks={tasks}
              setTasks={setTasks}
              setSelectedTask={setSelectedTask}
            />
          </TileAction>
        </Tile>
      </div>
      <TaskParentSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        sseClientId={sseClientId}
        runWithToast={runWithToast}
      />
      <TaskSubtasksSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        sseClientId={sseClientId}
        runWithToast={runWithToast}
      />
      <TaskRelationsSection
        task={task}
        tasks={tasks}
        setTasks={setTasks}
        setSelectedTask={setSelectedTask}
        sseClientId={sseClientId}
        runWithToast={runWithToast}
      />
      {matchedIntegrations.length > 0 && (
        <div className="p-1 flex flex-col gap-2 max-w-full">
          <Tile
            className="md:w-full items-start p-0 flex-col gap-1"
            variant={"transparent"}
          >
            <TileHeader>
              <TileTitle asChild>
                <InlineLabel
                  icon={<IconPlug />}
                  text="Integrations"
                  className="text-xs text-muted-foreground [&_svg]:size-4 ps-6"
                />
              </TileTitle>
            </TileHeader>
            <TileAction className="flex flex-col gap-1 items-start">
              {matchedIntegrations.map(({ config, activity }) => {
                const url = config.getUrl(activity.toValue?.data);
                if (url) {
                  return (
                    <a
                      key={activity.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "bg-transparent p-1 h-auto w-fit inline-flex items-center rounded-lg hover:bg-secondary border border-transparent hover:border-border group/link transition-all",
                        config.className,
                      )}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        {config.icon}
                        <span>{config.label}</span>
                        <IconExternalLink className="size-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-all" />
                      </div>
                    </a>
                  );
                }
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-2 text-xs p-1"
                  >
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                );
              })}
            </TileAction>
          </Tile>
        </div>
      )}
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
}: Omit<TaskContentSideContentProps, "sseClientId" | "runWithToast">) {
  const { permissions } = useLayoutOrganization();
  const { account } = useLayoutData();
  const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center flex-wrap gap-1 w-full overflow-x-auto py-1">
        <TaskFieldToolbar
          task={task}
          variant="compact"
          fieldPermissions={fieldPerms}
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
  const { permissions } = useLayoutOrganization();
  const { account } = useLayoutData();
  const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);

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
          canEdit={fieldPerms.category ?? true}
        />
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

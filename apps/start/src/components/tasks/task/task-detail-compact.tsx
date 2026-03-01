import type { schema } from "@repo/database";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLink } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { deriveAvailableUsers, type TaskDetailOrganization } from "../types";
import TaskFieldToolbar from "../shared/task-field-toolbar";
import { TaskEditableHeader } from "./editable-header";
import GlobalTimeline from "./timeline/root";

export interface TaskDetailCompactProps {
  task: schema.TaskWithLabels;
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
  labels: schema.labelType[];
  categories: schema.categoryType[];
  releases?: schema.releaseType[];
  /** Extra elements rendered at the end of the toolbar (e.g. expand toggle) */
  toolbarExtra?: ReactNode;
  /**
   * Optional organization for richer functionality.
   * When an `OrganizationWithMembers` is passed, the component derives
   * `availableUsers` from its members. Otherwise it falls back to
   * `task.assignees` (cross-org mode).
   *
   * Also used for clipboard slug and display links when available;
   * falls back to `task.organization` when absent.
   */
  organization?: TaskDetailOrganization;
}

/**
 * Compact task detail view used in dialogs and inbox panels.
 * Renders a toolbar + editable header + timeline in a single column.
 * Filters labels/categories/releases by the task's organizationId for cross-org support.
 */
export function TaskDetailCompact({
  task,
  tasks,
  setTasks,
  setSelectedTask,
  labels,
  categories,
  releases = [],
  toolbarExtra,
  organization,
}: TaskDetailCompactProps) {
  const { setValue: setMentionContext } =
    useStateManagement<MentionContext | null>("mentionContext", null);

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

  // Resolve the organization to use for display / clipboard.
  // Prefer the explicit prop; fall back to the minimal shape on `task.organization`.
  const resolvedOrg = organization ?? task.organization;

  // Derive available users: full member list when OrganizationWithMembers is
  // provided, otherwise fall back to the task's existing assignees.
  const availableUsers = deriveAvailableUsers(resolvedOrg, task);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-3 h-auto shrink-0 border-b overflow-x-auto">
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
          organization={resolvedOrg}
          fields={[
            {
              key: "identifier",
              compact: true,
            },
            {
              key: "status",
              iconOnly: true,
            },
            {
              key: "visibility",
              compact: true,
            },
            "priority",
            { key: "labels", compact: true },
            { key: "assignees", compact: true },
            "category",
            "release",

            "vote",
            { key: "githubIssue", iconOnly: true },
            { key: "githubPr", iconOnly: true },
          ]}
        />
        <SimpleClipboard
          textToCopy={`https://${resolvedOrg?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
          variant="ghost"
          className="h-7 p-1 w-fit"
          copyIcon={<IconLink className="size-4" />}
          tooltipText="Copy task URL"
          tooltipSide="bottom"
        />

        {toolbarExtra}
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-0 *:h-auto">
        <TaskEditableHeader
          task={task}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          categories={orgCategories}
          organization={resolvedOrg}
          showContent="both"
        />
        <GlobalTimeline
          task={task}
          labels={orgLabels}
          availableUsers={availableUsers}
          categories={orgCategories}
          tasks={tasks}
          releases={orgReleases}
          organization={resolvedOrg}
        />
      </div>
    </div>
  );
}

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { getInitials } from "@repo/util";
import {
  IconAlertSquareFilled,
  IconBuilding,
  IconCategory,
  IconList,
  IconListDetails,
  IconRocket,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { BoardDataSource } from "../core/board-data";
import type { TaskItem } from "../core/board-item";
import type { PriorityValue, StatusValue } from "./field-config";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./field-config";
import {
  type BoardColumn,
  type BoardGroupingContext,
  type BoardGroupingDefinition,
  bucketByAssignee,
  bucketByCategory,
  bucketByOrg,
  bucketByRelease,
  bucketByValue,
  createGroupingRegistry,
  getCategoryDropPatch,
  getPriorityDropPatch,
  getReleaseDropPatch,
  getStatusDropPatch,
  type GroupingRegistry,
  NONE_COLUMN_ID,
  NONE_GROUPING_ID,
  omitCompletedStatuses,
  resolveEffectiveSubGrouping,
  resolveGroupingDefinition,
} from "./grouping-registry";

// The group ids are defined with the pure registry helpers; re-exported so existing
// importers (drag actions, tests) keep their import path.
export {
  NO_ORG_GROUP_ID,
  NO_RELEASE_GROUP_ID,
  UNASSIGNED_GROUP_ID,
  UNCATEGORIZED_GROUP_ID,
} from "./grouping-registry";

export interface BoardTaskGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  /**
   * Semantic header tint for status/priority groups — a Tailwind class
   * (e.g. "bg-primary/5") tied to the app's theme tokens, not a raw color,
   * so it stays correct across themes. See STATUS_TONE_CLASSES/
   * PRIORITY_TONE_CLASSES below.
   */
  toneClassName?: string;
  /** Raw hex tint for category/release groups — these are user-picked colors with no theme-token equivalent. */
  color?: string;
  tasks: schema.TaskWithLabels[];
  /** Carried through from `BoardColumn` — none of the built-in groupings set these. */
  header?: ReactNode;
  description?: ReactNode;
  emptyMessage?: string;
  subGroups?: BoardTaskGroup[];
}

export interface BoardGroupingOptions {
  categories?: readonly schema.categoryType[];
  releases?: readonly schema.releaseType[];
  /**
   * When false, the Done/Canceled status groups are dropped from the
   * returned array entirely (not left present-but-empty for the UI to
   * collapse) — matches the org-scoped system's statusGrouping.group(),
   * which does the same .filter() for the identical reason: those two
   * statuses ARE "completed", so this toggle is specifically about them,
   * not a generic empty-group rule. Applies whenever status is the
   * grouping OR the sub-grouping, since both route through this same
   * function. Board.tsx already filters completed tasks out of the input
   * before grouping, so unlike the old system this doesn't also need to
   * re-filter tasks here — only the two group entries themselves.
   */
  showCompletedTasks?: boolean;
  /** Registry to resolve the grouping id in; defaults to the built-ins. Views pass the provider's (built-ins + page-supplied). */
  groupings?: GroupingRegistry;
  /**
   * The full data source the grouping's context should carry. Absent = synthesized from the tasks being grouped
   * plus `categories`/`releases` above (what the built-ins read).
   */
  data?: BoardDataSource;
  /** Overrides `data.pagination.hasMore` for the context's `partial`. */
  partial?: boolean;
  /** Injected "today" for groupings that depend on it. */
  now?: Date;
}

// Same theme-token classes the app's existing group-header styling already
// uses elsewhere (bg-muted/bg-primary/bg-success/bg-destructive) — these are
// generic Tailwind/theme utility classes, not code imported from the old
// system. Backlog/todo both read as neutral "not started yet" grays; todo is
// deliberately a shade more present than backlog.
export const STATUS_TONE_CLASSES: Record<StatusValue, string | undefined> = {
  backlog: "bg-muted/50",
  todo: "bg-muted",
  "in-progress": "bg-primary/5",
  done: "bg-success/5",
  canceled: "bg-destructive/5",
};

const PRIORITY_TONE_CLASSES: Record<PriorityValue, string | undefined> = {
  urgent: "bg-destructive/10",
  high: "bg-orange-800/15",
  medium: "bg-primary/5",
  low: undefined,
  none: undefined,
};

const STATUS_KEYS = Object.keys(STATUS_CONFIG) as StatusValue[];
const PRIORITY_KEYS = Object.keys(PRIORITY_CONFIG) as PriorityValue[];

const statusGrouping: BoardGroupingDefinition = {
  id: "status",
  label: "Status",
  icon: <IconListDetails className="h-4 w-4" />,
  persistable: true,
  group: (items, { showCompletedTasks }) =>
    bucketByValue(
      items,
      omitCompletedStatuses(STATUS_KEYS, showCompletedTasks),
      (task) => task.status,
    ).map(({ id, items: bucket }) => ({
      id,
      label: STATUS_CONFIG[id].label,
      items: bucket,
      // h-3.5 w-3.5 — matches the glyph size FieldStatus/FieldPriority render
      // on the rows below (field-status.tsx/field-priority.tsx both call
      // icon("h-3.5 w-3.5")), so the header's icon isn't visibly larger.
      icon: STATUS_CONFIG[id].icon("h-3.5 w-3.5"),
      toneClassName: STATUS_TONE_CLASSES[id],
    })),
  getDropPatch: (item, columnId) => getStatusDropPatch(item, columnId),
};

const priorityGrouping: BoardGroupingDefinition = {
  id: "priority",
  label: "Priority",
  icon: <IconAlertSquareFilled className="h-4 w-4" />,
  persistable: true,
  group: (items) =>
    bucketByValue(items, PRIORITY_KEYS, (task) => task.priority).map(
      ({ id, items: bucket }) => ({
        id,
        label: PRIORITY_CONFIG[id].label,
        items: bucket,
        // Same h-3.5 w-3.5 sizing note as statusGrouping above.
        icon: PRIORITY_CONFIG[id].icon("h-3.5 w-3.5"),
        toneClassName: PRIORITY_TONE_CLASSES[id],
      }),
    ),
  getDropPatch: (item, columnId) => getPriorityDropPatch(item, columnId),
};

const assigneeGrouping: BoardGroupingDefinition = {
  id: "assignee",
  label: "Assignee",
  icon: <IconUser className="h-4 w-4" />,
  persistable: true,
  // A task with several assignees sits in several columns at once.
  multiMembership: true,
  group: (items) => bucketByAssignee(items),
  // No getDropPatch: a task can appear in several assignee buckets, and a drop
  // can't express whether existing assignees should be retained, so assignee
  // regrouping intentionally no-ops.
};

const categoryGrouping: BoardGroupingDefinition = {
  id: "category",
  label: "Category",
  icon: <IconCategory className="h-4 w-4" />,
  persistable: true,
  group: (items, { data }) => bucketByCategory(items, data.categories),
  getDropPatch: (item, columnId, { data }) =>
    getCategoryDropPatch(item, columnId, data.categories),
};

const releaseGrouping: BoardGroupingDefinition = {
  id: "release",
  label: "Release",
  icon: <IconRocket className="h-4 w-4" />,
  persistable: true,
  group: (items, { data }) => bucketByRelease(items, data.releases),
  getDropPatch: (item, columnId, { data }) =>
    getReleaseDropPatch(item, columnId, data.releases),
};

/**
 * Groups tasks by their organization — the whole point of this cross-org
 * lander. task.organization is attached manually per task when the /home
 * route aggregates tasks across orgs (getTasksByOrganizationId doesn't embed
 * it); a task somehow missing it falls into "No organization" rather than
 * being dropped.
 */
const orgGrouping: BoardGroupingDefinition = {
  id: "org",
  label: "Organization",
  icon: <IconBuilding className="h-4 w-4" />,
  persistable: true,
  group: (items) =>
    bucketByOrg(items).map(({ id, label, items: bucket, logo, isKnownOrg }) => ({
      id,
      label,
      items: bucket,
      icon: isKnownOrg ? (
        <Avatar className="size-3.5 rounded-sm">
          <AvatarImage src={logo ?? undefined} alt={label} />
          <AvatarFallback className="rounded-sm text-[7px]">
            {getInitials(label)}
          </AvatarFallback>
        </Avatar>
      ) : undefined,
    })),
  // No getDropPatch: a task's organization isn't a mutable field — dragging
  // between org groups can't reassign it, so org regrouping intentionally no-ops.
};

/** Every item in one column; views render it as ungrouped (no group header). Not a Group-by menu option. */
const noneGrouping: BoardGroupingDefinition = {
  id: NONE_GROUPING_ID,
  label: "None",
  icon: <IconList className="h-4 w-4" />,
  // Page-local: never stored in a saved view (TaskGroupingId has no "none").
  persistable: false,
  canSubGroup: false,
  group: (items) => [{ id: NONE_COLUMN_ID, label: "All", items: [...items] }],
};

/**
 * The built-ins, in "Group by" menu order (status, org, priority, assignee,
 * category, release — NOT the order a kanban would list them). `none` is last
 * and is kept out of the menu by config/grouping-options.tsx.
 */
export const BUILT_IN_GROUPINGS: readonly BoardGroupingDefinition[] = [
  statusGrouping,
  orgGrouping,
  priorityGrouping,
  assigneeGrouping,
  categoryGrouping,
  releaseGrouping,
  noneGrouping,
];

/** The registry used when a page passes no extra definitions to `BoardProvider`. */
export const DEFAULT_GROUPING_REGISTRY: GroupingRegistry =
  createGroupingRegistry(BUILT_IN_GROUPINGS);

function buildGroupingContext(
  tasks: readonly TaskItem[],
  {
    categories = [],
    releases = [],
    showCompletedTasks = true,
    data,
    partial,
    now,
  }: BoardGroupingOptions,
): BoardGroupingContext {
  return {
    data: data ?? { items: tasks, labels: [], categories, releases },
    showCompletedTasks,
    partial: partial ?? data?.pagination?.hasMore ?? false,
    now: now ?? new Date(),
  };
}

/** Maps a registry column to the `tasks`-keyed shape the views consume. */
function columnToGroup(column: BoardColumn): BoardTaskGroup {
  const { items, subGroups, ...rest } = column;
  return {
    ...rest,
    tasks: items,
    subGroups: subGroups?.map(columnToGroup),
  };
}

/**
 * Groups tasks into registry columns (`items`-keyed). `groupBy` is any registered id (an unknown
 * one falls back to status), looked up in `options.groupings` (default: built-ins).
 */
export function groupTasksAsColumns(
  tasks: readonly schema.TaskWithLabels[],
  groupBy: string,
  options: BoardGroupingOptions = {},
): BoardColumn[] {
  return resolveGroupingDefinition(
    options.groupings ?? DEFAULT_GROUPING_REGISTRY,
    groupBy,
  ).group(tasks, buildGroupingContext(tasks, options));
}

/**
 * One optional sub-grouping level, as registry columns. A primary grouping with
 * `canSubGroup: false` gets no sub-groups.
 */
export function applyNestedGroupingAsColumns(
  tasks: readonly schema.TaskWithLabels[],
  groupBy: string,
  subGroupBy: string,
  options: BoardGroupingOptions = {},
): BoardColumn[] {
  const effectiveSubGroupBy = resolveEffectiveSubGrouping(
    options.groupings ?? DEFAULT_GROUPING_REGISTRY,
    groupBy,
    subGroupBy,
  );
  return groupTasksAsColumns(tasks, groupBy, options).map((column) => ({
    ...column,
    subGroups:
      effectiveSubGroupBy === NONE_GROUPING_ID
        ? undefined
        : groupTasksAsColumns(column.items, effectiveSubGroupBy, options),
  }));
}

/**
 * Groups board tasks without importing the retired task-view system. A
 * facade over the grouping registry that returns the `tasks`-keyed shape the
 * list view consumes (see `groupTasksAsColumns`).
 */
export function groupTasks(
  tasks: readonly schema.TaskWithLabels[],
  groupBy: string,
  options: BoardGroupingOptions = {},
): BoardTaskGroup[] {
  return groupTasksAsColumns(tasks, groupBy, options).map(columnToGroup);
}

/** Applies one optional subgrouping level for the list and kanban board views. */
export function applyNestedGrouping(
  tasks: readonly schema.TaskWithLabels[],
  groupBy: string,
  subGroupBy: string,
  options: BoardGroupingOptions = {},
): BoardTaskGroup[] {
  return applyNestedGroupingAsColumns(tasks, groupBy, subGroupBy, options).map(
    columnToGroup,
  );
}

// Same order the status grouping itself uses (backlog → canceled) — reused
// so "not done/canceled first" subtask ordering matches how the board
// already orders things everywhere else.
const STATUS_ORDER = Object.keys(STATUS_CONFIG) as StatusValue[];

/**
 * List-view-only: tasks whose parent is also in the same task list are
 * subtasks, and don't get their own top-level group membership — they
 * always render nested under their parent's row instead, in whichever
 * group the parent lands in, regardless of the subtask's own status. Call
 * this on the full task list before grouping (list view only — kanban is
 * untouched, subtasks still render as their own cards there for now).
 *
 * A subtask whose parent isn't in the list (different org, filtered out,
 * etc.) has nowhere to nest under, so it's treated as top-level.
 */
export function getTopLevelTasks(
  tasks: readonly schema.TaskWithLabels[],
): schema.TaskWithLabels[] {
  const ids = new Set(tasks.map((task) => task.id));
  return tasks.filter((task) => !task.parentId || !ids.has(task.parentId));
}

/**
 * parentId -> its subtasks (the full TaskWithLabels, not the lightweight
 * schema.SubtaskSummary relation — getTasksByOrganizationId already
 * returns every task in the org as flat rows, subtasks included, so no
 * extra fetch is needed). Sorted with anything not done/canceled first.
 */
export function buildSubtaskMap(
  tasks: readonly schema.TaskWithLabels[],
): Map<string, schema.TaskWithLabels[]> {
  const ids = new Set(tasks.map((task) => task.id));
  const map = new Map<string, schema.TaskWithLabels[]>();

  for (const task of tasks) {
    if (!task.parentId || !ids.has(task.parentId)) continue;
    const siblings = map.get(task.parentId) ?? [];
    siblings.push(task);
    map.set(task.parentId, siblings);
  }

  for (const siblings of map.values()) {
    siblings.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status as StatusValue) -
        STATUS_ORDER.indexOf(b.status as StatusValue),
    );
  }

  return map;
}

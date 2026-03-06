import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconCategory,
  IconLabel,
  IconLock,
  IconLockOpen2,
  IconRocket,
  IconUserPlus,
} from "@tabler/icons-react";
import React, { useMemo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import RenderIcon from "@/components/generic/RenderIcon";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateLabelToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { TaskDetailOrganization } from "../types";
import GlobalTaskAssignees from "./assignee";
import GlobalTaskCategory from "./category";
import { priorityConfig, statusConfig } from "./config";
import GlobalTaskGithubIssue from "./github-issue";
import GlobalTaskGithubPr from "./github-pr";
import GlobalTaskIdentifier from "./identifier";
import GlobalTaskLabels from "./label";
import GlobalTaskPriority from "./priority";
import GlobalTaskRelease from "./release";
import GlobalTaskStatus from "./status";
import GlobalTaskVisibility from "./visibility";
import { TaskVoting } from "./voting";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type FieldKey =
  | "identifier"
  | "status"
  | "priority"
  | "labels"
  | "assignees"
  | "category"
  | "visibility"
  | "release"
  | "vote"
  | "githubIssue"
  | "githubPr";

/** Per-field presentation overrides. */
export interface FieldConfig {
  key: FieldKey;
  /** Show only the icon, hide the text label. Overrides `compact` and `showLabel`. */
  iconOnly?: boolean;
  /** Compact display mode (behavior varies per field). */
  compact?: boolean;
  /** Show a text label beside the trigger. */
  showLabel?: boolean;
  /** Show a chevron/caret on the dropdown trigger. */
  showChevron?: boolean;
  /** Extra className merged onto the field trigger. */
  className?: string;
}

/** A field entry is either a plain key (uses variant defaults) or an object with overrides. */
export type FieldEntry = FieldKey | FieldConfig;

/** Default field order when no `fields` prop is provided. */
const DEFAULT_FIELDS: FieldEntry[] = [
  "status",
  "priority",
  "labels",
  "assignees",
  "category",
  "visibility",
  "release",
];

/** Normalize a FieldEntry into a resolved config. */
function resolveFieldEntry(entry: FieldEntry): FieldConfig {
  if (typeof entry === "string") return { key: entry };
  return entry;
}

export interface TaskFieldToolbarProps {
  task: schema.TaskWithLabels;
  editable?: boolean;

  /**
   * Ordered array of fields to render.
   * - Each entry is a `FieldKey` string (variant defaults) or a `FieldConfig`
   *   object with per-field presentation overrides.
   * - Presence in the array = visible; absence = hidden.
   * - Array order = render order.
   * - When omitted, defaults to `DEFAULT_FIELDS`.
   */
  fields?: FieldEntry[];

  // Data for pickers
  availableLabels?: schema.labelType[];
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  releases?: schema.releaseType[];

  /** Organization used by the `identifier` field for slug display & clipboard URL */
  organization?: TaskDetailOrganization;

  // --- Creator mode: simple onChange callbacks ---
  onChange?: {
    status?: (value: string | undefined) => void;
    priority?: (value: string | undefined) => void;
    labels?: (ids: string[]) => void;
    assignees?: (ids: string[]) => void;
    category?: (id: string) => void;
    visibility?: (value: "public" | "private") => void;
    release?: (id: string) => void;
  };

  // --- Label creation ---
  /** If true, shows an inline "Create label" form when no labels match search */
  canCreateLabel?: boolean;
  /** Called with the full updated labels list after a new label is created */
  onLabelCreated?: (newLabels: schema.labelType[]) => void;

  // --- Detail mode: internal optimistic updates ---
  useInternalLogic?: boolean;
  tasks?: schema.TaskWithLabels[];
  setTasks?: (tasks: schema.TaskWithLabels[]) => void;
  setSelectedTask?: (task: schema.TaskWithLabels | null) => void;

  // --- Presentation ---
  /** @default "creator" */
  variant?: "creator" | "compact" | "sidebar";
}

// ────────────────────────────────────────────────────────────────────────────
// Variant style presets
// ────────────────────────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  creator: {
    container: "flex items-center flex-wrap gap-1 w-full",
    showLabel: false,
    showChevron: false,
    compact: false,
    className: "",
    useCustomTrigger: true,
  },
  compact: {
    container: "flex items-center flex-wrap gap-1 w-full",
    showLabel: false,
    showChevron: false,
    compact: true,
    className:
      "bg-accent p-1 h-auto w-fit shrink-0 border-transparent hover:bg-secondary",
    useCustomTrigger: false,
  },
  sidebar: {
    container: "flex flex-col gap-2",
    showLabel: false,
    showChevron: false,
    compact: false,
    className: "bg-transparent p-1 h-auto w-fit",
    useCustomTrigger: false,
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function TaskFieldToolbar({
  task,
  editable = true,
  fields: fieldsProp,
  availableLabels = [],
  availableUsers = [],
  categories = [],
  releases = [],
  organization,
  onChange,
  canCreateLabel = false,
  onLabelCreated,
  useInternalLogic = false,
  tasks = [],
  setTasks,
  setSelectedTask,
  variant = "creator",
}: TaskFieldToolbarProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast } = useToastAction();
  const style = VARIANT_STYLES[variant];

  // Resolve the ordered field list into normalized configs
  const resolvedFields = (fieldsProp ?? DEFAULT_FIELDS).map(resolveFieldEntry);

  // ── Derived state for creator variant triggers ──────────────────────
  const resolvedStatus = (task.status ?? "backlog") || "backlog";
  const resolvedPriority = (task.priority ?? "none") || "none";
  const statusCfg = statusConfig[resolvedStatus as keyof typeof statusConfig];
  const priorityCfg =
    priorityConfig[resolvedPriority as keyof typeof priorityConfig];

  const selectedLabels = task.labels ?? [];
  const selectedAssignees = task.assignees ?? [];
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === task.category),
    [categories, task.category],
  );
  const selectedRelease = useMemo(
    () => releases.find((r) => r.id === task.releaseId),
    [releases, task.releaseId],
  );

  // ── Internalized Priority callback (detail mode) ───────────────────
  const handlePriorityChange = useInternalLogic
    ? async (value: string) => {
        onChange?.priority?.(value);

        if (setTasks && setSelectedTask) {
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
                { type: "timeline-update", payload: data.data.id },
                "*",
              );
            }
          }
        }
      }
    : undefined;

  // ── Internalized Labels callback (detail mode, debounced) ──────────
  const debouncedUpdateLabels = useDebounceAsync(
    async (values: string[], _wsClientId: string) => {
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
            _wsClientId,
          ),
      );
      return data;
    },
    1500,
  );

  const handleLabelsChange = useInternalLogic
    ? async (values: string[]) => {
        onChange?.labels?.(values);

        if (setTasks && setSelectedTask) {
          const updatedTasks = tasks.map((t) =>
            t.id === task.id
              ? {
                  ...task,
                  labels: availableLabels.filter((label) =>
                    values.includes(label.id),
                  ),
                }
              : t,
          );
          setTasks(updatedTasks);
          setSelectedTask({
            ...task,
            labels: availableLabels.filter((label) =>
              values.includes(label.id),
            ),
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
                { type: "timeline-update", payload: data.data.id },
                "*",
              );
            }
          }
        }
      }
    : undefined;

  // ── Creator-variant custom triggers ─────────────────────────────────
  // Each trigger is a function of FieldConfig so `iconOnly` can suppress text.

  const creatorStatusTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7", cfg.className)}
      size={"sm"}
    >
      {statusCfg?.icon(`h-3.5 w-3.5 ${statusCfg?.className || ""}`)}
      {!cfg.iconOnly && (statusCfg?.label || "Status")}
    </Button>
  );

  const creatorPriorityTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7", cfg.className)}
      size={"sm"}
    >
      {priorityCfg?.icon(`h-3.5 w-3.5 ${priorityCfg?.className || ""}`)}
      {!cfg.iconOnly && (priorityCfg?.label || "Priority")}
    </Button>
  );

  const creatorLabelsTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7 line-clamp-1", cfg.className)}
      size={"sm"}
    >
      {selectedLabels.length > 1 ? (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {selectedLabels.map((label) => (
              <span
                key={label.id}
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: label.color || "#cccccc" }}
              />
            ))}
          </div>
          {!cfg.iconOnly && <span>{selectedLabels.length} labels</span>}
        </div>
      ) : selectedLabels.length === 1 ? (
        <div className="flex items-center">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              !cfg.iconOnly && "mr-2",
            )}
            style={{ backgroundColor: selectedLabels[0]?.color || "#cccccc" }}
          />
          {!cfg.iconOnly && <span>{selectedLabels[0]?.name}</span>}
        </div>
      ) : (
        <span className="flex items-center gap-2">
          <IconLabel className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
          {!cfg.iconOnly && "Labels"}
        </span>
      )}
    </Button>
  );

  const creatorAssigneesTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7 line-clamp-1", cfg.className)}
      size={"sm"}
    >
      {selectedAssignees.length > 1 ? (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {selectedAssignees.map((assignee) => (
              <Avatar
                key={assignee.id}
                className="h-4 w-4 border border-background"
              >
                <AvatarImage
                  src={assignee.image || undefined}
                  alt={assignee.name}
                />
                <AvatarFallback className="text-[8px]">
                  {assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {!cfg.iconOnly && <span>{selectedAssignees.length} assignees</span>}
        </div>
      ) : selectedAssignees.length === 1 ? (
        <div className="flex items-center">
          <Avatar className={cn("h-4 w-4", !cfg.iconOnly && "mr-2")}>
            <AvatarImage
              src={selectedAssignees[0]?.image || undefined}
              alt={selectedAssignees[0]?.name}
            />
            <AvatarFallback className="text-[8px]">
              {selectedAssignees[0]?.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {!cfg.iconOnly && <span>{selectedAssignees[0]?.name}</span>}
        </div>
      ) : (
        <span className="flex items-center gap-2">
          <IconUserPlus
            className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
          />
          {!cfg.iconOnly && "Assignees"}
        </span>
      )}
    </Button>
  );

  const creatorCategoryTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7", cfg.className)}
      size={"sm"}
    >
      {selectedCategory ? (
        <>
          <RenderIcon
            iconName={selectedCategory.icon || "IconCircleFilled"}
            className={cn(
              "size-3.5! [&_svg]:size-3.5!",
              !cfg.iconOnly && "mr-1",
            )}
            color={selectedCategory.color || undefined}
            button
          />
          {!cfg.iconOnly && selectedCategory.name}
        </>
      ) : (
        <>
          <IconCategory
            className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
          />
          {!cfg.iconOnly && "Category"}
        </>
      )}
    </Button>
  );

  const creatorVisibilityTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn(
        "w-fit text-xs h-7",
        task.visible === "private" && "border-primary/50",
        cfg.className,
      )}
      size={"sm"}
      onClick={() =>
        onChange?.visibility?.(
          task.visible === "private" ? "public" : "private",
        )
      }
    >
      {task.visible === "private" ? (
        <>
          <IconLock className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
          {!cfg.iconOnly && "Private"}
        </>
      ) : (
        <>
          <IconLockOpen2
            className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
          />
          {!cfg.iconOnly && "Public"}
        </>
      )}
    </Button>
  );

  const creatorReleaseTrigger = (cfg: FieldConfig) => (
    <Button
      variant={"primary"}
      className={cn("w-fit text-xs h-7", cfg.className)}
      size={"sm"}
    >
      {selectedRelease ? (
        <>
          {selectedRelease.icon ? (
            <RenderIcon
              iconName={selectedRelease.icon}
              className={cn(
                "size-3.5! [&_svg]:size-3.5!",
                !cfg.iconOnly && "mr-1",
              )}
              color={selectedRelease.color || undefined}
              button
            />
          ) : (
            <IconRocket
              className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")}
            />
          )}
          {!cfg.iconOnly && selectedRelease.name}
        </>
      ) : (
        <>
          <IconRocket className={cn("h-3.5 w-3.5", !cfg.iconOnly && "mr-1")} />
          {!cfg.iconOnly && "Release"}
        </>
      )}
    </Button>
  );

  // ── Shared props helpers ────────────────────────────────────────────

  /** Build shared props for a specific field, merging variant defaults with per-field overrides. */
  const buildSharedProps = (cfg: FieldConfig) => {
    // iconOnly implies compact=true, showLabel=false, showChevron=false
    const isIconOnly = cfg.iconOnly ?? false;
    const fieldCompact = isIconOnly || (cfg.compact ?? style.compact);
    const fieldShowLabel = isIconOnly
      ? false
      : (cfg.showLabel ?? style.showLabel);
    const fieldShowChevron = isIconOnly
      ? false
      : (cfg.showChevron ?? style.showChevron);
    const fieldClassName = cn(
      style.useCustomTrigger ? "" : style.className,
      cfg.className,
    );

    return {
      task,
      editable,
      ...(style.useCustomTrigger
        ? {}
        : {
            showLabel: fieldShowLabel,
            showChevron: fieldShowChevron,
            compact: fieldCompact,
            className: fieldClassName || undefined,
          }),
      ...(useInternalLogic
        ? {
            useInternalLogic: true as const,
            tasks,
            setTasks,
            setSelectedTask,
          }
        : {}),
    };
  };

  // ── Field renderers map ─────────────────────────────────────────────

  const FIELD_RENDERERS: Record<
    FieldKey,
    (cfg: FieldConfig) => React.ReactNode
  > = {
    status: (cfg) => (
      <GlobalTaskStatus
        {...buildSharedProps(cfg)}
        onChange={onChange?.status}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorStatusTrigger(cfg) }
          : {})}
      />
    ),

    priority: (cfg) => (
      <GlobalTaskPriority
        {...buildSharedProps(cfg)}
        {...(useInternalLogic && handlePriorityChange
          ? { onPriorityChange: handlePriorityChange }
          : { onChange: onChange?.priority })}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorPriorityTrigger(cfg) }
          : {})}
      />
    ),

    labels: (cfg) => (
      <GlobalTaskLabels
        {...buildSharedProps(cfg)}
        availableLabels={availableLabels}
        canCreateLabel={canCreateLabel}
        onLabelCreated={onLabelCreated}
        {...(useInternalLogic && handleLabelsChange
          ? { onLabelsChange: handleLabelsChange }
          : { onLabelsChange: onChange?.labels })}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorLabelsTrigger(cfg), customChildren: true }
          : {})}
      />
    ),

    assignees: (cfg) => (
      <GlobalTaskAssignees
        {...buildSharedProps(cfg)}
        availableUsers={availableUsers}
        onChange={onChange?.assignees}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorAssigneesTrigger(cfg) }
          : {})}
      />
    ),

    category: (cfg) => (
      <GlobalTaskCategory
        {...buildSharedProps(cfg)}
        categories={categories}
        onChange={onChange?.category}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorCategoryTrigger(cfg) }
          : {})}
      />
    ),

    visibility: (cfg) =>
      style.useCustomTrigger ? (
        // Creator variant: simple toggle button (not a ComboBox)
        creatorVisibilityTrigger(cfg)
      ) : (
        <GlobalTaskVisibility
          {...buildSharedProps(cfg)}
          onChange={onChange?.visibility}
        />
      ),

    release: (cfg) => (
      <GlobalTaskRelease
        {...buildSharedProps(cfg)}
        releases={releases}
        onChange={onChange?.release}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorReleaseTrigger(cfg) }
          : {})}
      />
    ),

    vote: (cfg) => {
      const isIconOnly = cfg.iconOnly ?? false;
      const fieldCompact = isIconOnly || (cfg.compact ?? style.compact);
      return (
        <TaskVoting
          task={task}
          editable={editable}
          organizationId={task.organizationId}
          wsClientId={wsClientId}
          tasks={tasks}
          setTasks={setTasks ?? (() => {})}
          setSelectedTask={setSelectedTask ?? (() => {})}
          compact={fieldCompact}
          iconOnly={isIconOnly}
          className={cn(
            style.useCustomTrigger ? "w-fit text-xs" : style.className,
            "bg-transparent!",
            cfg.className,
          )}
        />
      );
    },

    identifier: (cfg) => {
      if (!organization) return null;
      const isIconOnly = cfg.iconOnly ?? false;
      const fieldCompact = isIconOnly || (cfg.compact ?? style.compact);
      return (
        <GlobalTaskIdentifier
          task={task}
          organization={organization}
          compact={fieldCompact}
          iconOnly={isIconOnly}
          className={cfg.className}
        />
      );
    },

    githubIssue: (cfg) => {
      const isIconOnly = cfg.iconOnly ?? false;
      const fieldCompact = isIconOnly || (cfg.compact ?? style.compact);
      return (
        <GlobalTaskGithubIssue
          task={task}
          compact={fieldCompact}
          iconOnly={isIconOnly}
          variant={variant === "sidebar" ? "sidebar" : "button"}
          className={cfg.className}
        />
      );
    },

    githubPr: (cfg) => {
      const isIconOnly = cfg.iconOnly ?? false;
      const fieldCompact = isIconOnly || (cfg.compact ?? style.compact);
      return (
        <GlobalTaskGithubPr
          task={task}
          compact={fieldCompact}
          iconOnly={isIconOnly}
          variant={variant === "sidebar" ? "sidebar" : "button"}
          className={cfg.className}
        />
      );
    },
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className={style.container}>
      {resolvedFields.map((cfg) => {
        const renderer = FIELD_RENDERERS[cfg.key];
        if (!renderer) return null;
        const node = renderer(cfg);
        if (!node) return null;
        return <React.Fragment key={cfg.key}>{node}</React.Fragment>;
      })}
    </div>
  );
}

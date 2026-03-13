import { Button } from "@repo/ui/components/button";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconCategory,
  IconDots,
  IconGitBranch,
  IconLabel,
  IconLockOpen2,
  IconRocket,
  IconUserPlus,
} from "@tabler/icons-react";
import React, { useCallback, useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";

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
import TaskPicker from "./task-picker";
import {
  type FieldConfig,
  type FieldKey,
  type TaskFieldToolbarProps,
  DEFAULT_FIELDS,
  VARIANT_STYLES,
  resolveFieldEntry,
} from "./task-field-toolbar-types";
import {
  creatorAssigneesTrigger,
  creatorCategoryTrigger,
  creatorLabelsTrigger,
  creatorParentTrigger,
  creatorPriorityTrigger,
  creatorReleaseTrigger,
  creatorStatusTrigger,
  creatorVisibilityTrigger,
} from "./task-field-toolbar-triggers";

// Re-export types so existing consumers can still import from this module
export type {
  FieldKey,
  FieldConfig,
  FieldEntry,
  FieldPermissions,
  TaskFieldToolbarProps,
} from "./task-field-toolbar-types";
export {
  DEFAULT_FIELDS,
  VARIANT_STYLES,
  resolveFieldEntry,
  getTaskFieldPermissions,
} from "./task-field-toolbar-types";

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function TaskFieldToolbar({
  task,
  editable = true,
  fieldPermissions,
  fields: fieldsProp,
  availableLabels = [],
  availableUsers = [],
  categories = [],
  releases = [],
  organization,
  organizationId,
  selectedParentTask,
  onParentTaskChange,
  onChange,
  canCreateLabel = false,
  onLabelCreated,
  tasks = [],
  setTasks,
  setSelectedTask,
  variant = "creator",
}: TaskFieldToolbarProps) {
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
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

  // ── Overflow menu logic (creator variant only) ─────────────────────
  // Track which overflow field picker is currently open
  const [overflowOpenField, setOverflowOpenField] = useState<FieldKey | null>(
    null,
  );

  /** Check whether a field currently has a value set. Used to decide whether
   *  an overflow field should be promoted to the inline toolbar. */
  const fieldHasValue = useCallback(
    (key: FieldKey): boolean => {
      switch (key) {
        case "parent":
          return !!selectedParentTask;
        case "release":
          return !!task.releaseId;
        case "labels":
          return selectedLabels.length > 0;
        case "assignees":
          return selectedAssignees.length > 0;
        case "category":
          return !!task.category;
        case "visibility":
          return task.visible === "private"; // "public" is the default / no-value state
        case "status":
          return !!task.status && task.status !== "backlog";
        case "priority":
          return !!task.priority && task.priority !== "none";
        default:
          return false;
      }
    },
    [selectedParentTask, task, selectedLabels, selectedAssignees],
  );

  /** Icon + label metadata for overflow menu items */
  const OVERFLOW_FIELD_META: Partial<
    Record<FieldKey, { icon: React.ReactNode; label: string }>
  > = {
    parent: {
      icon: <IconGitBranch className="h-4 w-4" />,
      label: "Subtask of...",
    },
    release: {
      icon: <IconRocket className="h-4 w-4" />,
      label: "Release",
    },
    labels: {
      icon: <IconLabel className="h-4 w-4" />,
      label: "Labels",
    },
    assignees: {
      icon: <IconUserPlus className="h-4 w-4" />,
      label: "Assignees",
    },
    category: {
      icon: <IconCategory className="h-4 w-4" />,
      label: "Category",
    },
    visibility: {
      icon: <IconLockOpen2 className="h-4 w-4" />,
      label: "Visibility",
    },
  };

  // Split fields into inline (always shown) and overflow (behind "..." menu)
  // Overflow only applies when using creator variant (useCustomTrigger)
  const isOverflowEnabled = style.useCustomTrigger;
  const { inlineFields, overflowFields } = useMemo(() => {
    if (!isOverflowEnabled) {
      return { inlineFields: resolvedFields, overflowFields: [] };
    }
    const inline: FieldConfig[] = [];
    const overflow: FieldConfig[] = [];
    for (const cfg of resolvedFields) {
      if (cfg.overflow && !fieldHasValue(cfg.key)) {
        overflow.push(cfg);
      } else {
        inline.push(cfg);
      }
    }
    return { inlineFields: inline, overflowFields: overflow };
  }, [resolvedFields, isOverflowEnabled, fieldHasValue]);

  // ── Parent field: local popover state ─────────────────────────────
  const [parentPickerOpen, setParentPickerOpen] = useState(false);

  // ── Shared props helpers ──────────────────────────────────────────

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
      editable: fieldPermissions?.[cfg.key] ?? editable,
      tasks,
      setTasks,
      setSelectedTask,
      ...(style.useCustomTrigger
        ? {}
        : {
            showLabel: fieldShowLabel,
            showChevron: fieldShowChevron,
            compact: fieldCompact,
            className: fieldClassName || undefined,
          }),
    };
  };

  // ── Field renderers map ───────────────────────────────────────────

  const FIELD_RENDERERS: Record<
    FieldKey,
    (cfg: FieldConfig) => React.ReactNode
  > = {
    status: (cfg) => (
      <GlobalTaskStatus
        {...buildSharedProps(cfg)}
        onChange={onChange?.status}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorStatusTrigger(cfg, { statusCfg }) }
          : {})}
      />
    ),

    priority: (cfg) => (
      <GlobalTaskPriority
        {...buildSharedProps(cfg)}
        onChange={onChange?.priority}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorPriorityTrigger(cfg, { priorityCfg }) }
          : {})}
      />
    ),

    labels: (cfg) => (
      <GlobalTaskLabels
        {...buildSharedProps(cfg)}
        availableLabels={availableLabels}
        canCreateLabel={canCreateLabel}
        onLabelCreated={onLabelCreated}
        onLabelsChange={onChange?.labels}
        {...(style.useCustomTrigger
          ? {
              customTrigger: creatorLabelsTrigger(cfg, selectedLabels),
              customChildren: true,
            }
          : {})}
      />
    ),

    assignees: (cfg) => (
      <GlobalTaskAssignees
        {...buildSharedProps(cfg)}
        availableUsers={availableUsers}
        onChange={onChange?.assignees}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorAssigneesTrigger(cfg, selectedAssignees) }
          : {})}
      />
    ),

    category: (cfg) => (
      <GlobalTaskCategory
        {...buildSharedProps(cfg)}
        categories={categories}
        onChange={onChange?.category}
        {...(style.useCustomTrigger
          ? { customTrigger: creatorCategoryTrigger(cfg, selectedCategory) }
          : {})}
      />
    ),

    visibility: (cfg) =>
      style.useCustomTrigger ? (
        // Creator variant: simple toggle button (not a ComboBox)
        creatorVisibilityTrigger(cfg, task.visible, {
          onToggle: () =>
            onChange?.visibility?.(
              task.visible === "private" ? "public" : "private",
            ),
        })
      ) : (
        <GlobalTaskVisibility
          {...buildSharedProps(cfg)}
          onChange={onChange?.visibility}
        />
      ),

    release: (cfg) => {
      // Support controlled open from overflow menu
      const isOverflowTriggered = overflowOpenField === "release";
      return (
        <GlobalTaskRelease
          {...buildSharedProps(cfg)}
          releases={releases}
          onChange={onChange?.release}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorReleaseTrigger(cfg, selectedRelease) }
            : {})}
          {...(isOverflowTriggered
            ? {
                open: true,
                setOpen: (open: boolean) => {
                  if (!open) setOverflowOpenField(null);
                },
              }
            : {})}
        />
      );
    },

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
            "",
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

    parent: (cfg) => {
      // Only supported in creator variant; sidebar handles parent display separately
      if (!style.useCustomTrigger || !organizationId) return null;

      // Support controlled open from overflow menu
      const isOverflowTriggered = overflowOpenField === "parent";
      const isOpen = parentPickerOpen || isOverflowTriggered;

      const trigger = creatorParentTrigger(cfg, selectedParentTask, {
        onClear: () => {
          onChange?.parent?.(null);
          onParentTaskChange?.(null);
        },
      });

      return selectedParentTask ? (
        // When a parent is selected, show it inline (not inside a popover)
        trigger
      ) : (
        <TaskPicker
          organizationId={organizationId}
          onSelect={(t) => {
            onChange?.parent?.(t.id);
            onParentTaskChange?.(t);
            setParentPickerOpen(false);
            setOverflowOpenField(null);
          }}
          excludeIds={[]}
          filter={(t) => !t.parentId}
          searchPlaceholder="Search for parent task..."
          placeholder="Subtask of..."
          open={isOpen}
          onOpenChange={(open) => {
            setParentPickerOpen(open);
            if (!open) setOverflowOpenField(null);
          }}
          customTrigger={trigger}
        />
      );
    },
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className={style.container}>
      {inlineFields.map((cfg) => {
        const renderer = FIELD_RENDERERS[cfg.key];
        if (!renderer) return null;
        const node = renderer(cfg);
        if (!node) return null;
        return <React.Fragment key={cfg.key}>{node}</React.Fragment>;
      })}

      {/* Overflow: either show the "..." dropdown or the active field's picker */}
      {isOverflowEnabled &&
        overflowFields.length > 0 &&
        (overflowOpenField ? (
          // An overflow field was selected — render its picker directly (open={true} pattern)
          (() => {
            const activeCfg = overflowFields.find(
              (cfg) => cfg.key === overflowOpenField,
            );
            if (!activeCfg) return null;
            const renderer = FIELD_RENDERERS[activeCfg.key];
            if (!renderer) return null;
            return (
              <React.Fragment key={`overflow-active-${activeCfg.key}`}>
                {renderer(activeCfg)}
              </React.Fragment>
            );
          })()
        ) : (
          // No overflow field active — show the "..." menu
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={"primary"}
                className="w-fit text-xs h-7"
                size={"sm"}
              >
                <IconDots className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {overflowFields.map((cfg) => {
                const meta = OVERFLOW_FIELD_META[cfg.key];
                if (!meta) return null;
                return (
                  <DropdownMenuItem
                    key={cfg.key}
                    onSelect={() => {
                      setOverflowOpenField(cfg.key);
                    }}
                  >
                    {meta.icon}
                    {meta.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
    </div>
  );
}

"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBrandGithub,
  IconCategory,
  IconExternalLink,
  IconGitMerge,
  IconLabel,
  IconLock,
  IconLockOpen2,
  IconRocket,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
import GlobalTaskLabels from "./label";
import GlobalTaskPriority from "./priority";
import GlobalTaskRelease from "./release";
import GlobalTaskStatus from "./status";
import GlobalTaskVisibility from "./visibility";
import { TaskVoting } from "./voting";
import { ensureCdnUrl } from "@repo/util";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type FieldKey =
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

export interface TaskFieldToolbarProps {
  task: schema.TaskWithLabels;
  editable?: boolean;

  /** Toggle which fields to show. All default to `true`. */
  fields?: Partial<Record<FieldKey, boolean>>;

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

  // Default all fields to true
  const fields: Record<FieldKey, boolean> = {
    identifier: fieldsProp?.identifier ?? false,
    status: fieldsProp?.status ?? true,
    priority: fieldsProp?.priority ?? true,
    labels: fieldsProp?.labels ?? true,
    assignees: fieldsProp?.assignees ?? true,
    category: fieldsProp?.category ?? true,
    visibility: fieldsProp?.visibility ?? true,
    release: fieldsProp?.release ?? true,
    vote: fieldsProp?.vote ?? false,
    githubIssue: fieldsProp?.githubIssue ?? false,
    githubPr: fieldsProp?.githubPr ?? false,
  };

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

  const creatorStatusTrigger = (
    <Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
      {statusCfg?.icon(`h-3.5 w-3.5 ${statusCfg?.className || ""}`)}
      {statusCfg?.label || "Status"}
    </Button>
  );

  const creatorPriorityTrigger = (
    <Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
      {priorityCfg?.icon(`h-3.5 w-3.5 ${priorityCfg?.className || ""}`)}
      {priorityCfg?.label || "Priority"}
    </Button>
  );

  const creatorLabelsTrigger = (
    <Button
      variant={"primary"}
      className="w-fit text-xs h-7 line-clamp-1"
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
          <span>{selectedLabels.length} labels</span>
        </div>
      ) : selectedLabels.length === 1 ? (
        <div className="flex items-center">
          <span
            className="h-2 w-2 shrink-0 rounded-full mr-2"
            style={{ backgroundColor: selectedLabels[0]?.color || "#cccccc" }}
          />
          <span>{selectedLabels[0]?.name}</span>
        </div>
      ) : (
        <span className="flex items-center gap-2">
          <IconLabel className="h-3.5 w-3.5 mr-1" />
          Labels
        </span>
      )}
    </Button>
  );

  const creatorAssigneesTrigger = (
    <Button
      variant={"primary"}
      className="w-fit text-xs h-7 line-clamp-1"
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
          <span>{selectedAssignees.length} assignees</span>
        </div>
      ) : selectedAssignees.length === 1 ? (
        <div className="flex items-center">
          <Avatar className="h-4 w-4 mr-2">
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
          <span>{selectedAssignees[0]?.name}</span>
        </div>
      ) : (
        <span className="flex items-center gap-2">
          <IconUserPlus className="h-3.5 w-3.5 mr-1" />
          Assignees
        </span>
      )}
    </Button>
  );

  const creatorCategoryTrigger = (
    <Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
      {selectedCategory ? (
        <>
          <RenderIcon
            iconName={selectedCategory.icon || "IconCircleFilled"}
            className="size-3.5! [&_svg]:size-3.5! mr-1"
            color={selectedCategory.color || undefined}
            button
          />
          {selectedCategory.name}
        </>
      ) : (
        <>
          <IconCategory className="h-3.5 w-3.5 mr-1" />
          Category
        </>
      )}
    </Button>
  );

  const creatorVisibilityTrigger = (
    <Button
      variant={"primary"}
      className={cn(
        "w-fit text-xs h-7",
        task.visible === "private" && "border-primary/50",
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
          <IconLock className="h-3.5 w-3.5 mr-1" />
          Private
        </>
      ) : (
        <>
          <IconLockOpen2 className="h-3.5 w-3.5 mr-1" />
          Public
        </>
      )}
    </Button>
  );

  const creatorReleaseTrigger = (
    <Button variant={"primary"} className="w-fit text-xs h-7" size={"sm"}>
      {selectedRelease ? (
        <>
          {selectedRelease.icon ? (
            <RenderIcon
              iconName={selectedRelease.icon}
              className="size-3.5! [&_svg]:size-3.5! mr-1"
              color={selectedRelease.color || undefined}
              button
            />
          ) : (
            <IconRocket className="h-3.5 w-3.5 mr-1" />
          )}
          {selectedRelease.name}
        </>
      ) : (
        <>
          <IconRocket className="h-3.5 w-3.5 mr-1" />
          Release
        </>
      )}
    </Button>
  );

  // ── Shared props helpers ────────────────────────────────────────────

  const sharedProps = {
    task,
    editable,
    ...(style.useCustomTrigger
      ? {}
      : {
          showLabel: style.showLabel,
          showChevron: style.showChevron,
          compact: style.compact,
          className: style.className,
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

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className={style.container}>
      {fields.status && (
        <GlobalTaskStatus
          {...sharedProps}
          onChange={onChange?.status}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorStatusTrigger }
            : {})}
        />
      )}

      {fields.priority && (
        <GlobalTaskPriority
          {...sharedProps}
          {...(useInternalLogic && handlePriorityChange
            ? { onPriorityChange: handlePriorityChange }
            : { onChange: onChange?.priority })}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorPriorityTrigger }
            : {})}
        />
      )}

      {fields.labels && (
        <GlobalTaskLabels
          {...sharedProps}
          availableLabels={availableLabels}
          canCreateLabel={canCreateLabel}
          onLabelCreated={onLabelCreated}
          {...(useInternalLogic && handleLabelsChange
            ? { onLabelsChange: handleLabelsChange }
            : { onLabelsChange: onChange?.labels })}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorLabelsTrigger, customChildren: true }
            : {})}
        />
      )}

      {fields.assignees && (
        <GlobalTaskAssignees
          {...sharedProps}
          availableUsers={availableUsers}
          onChange={onChange?.assignees}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorAssigneesTrigger }
            : {})}
        />
      )}

      {fields.category && (
        <GlobalTaskCategory
          {...sharedProps}
          categories={categories}
          onChange={onChange?.category}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorCategoryTrigger }
            : {})}
        />
      )}

      {fields.visibility &&
        (style.useCustomTrigger ? (
          // Creator variant: simple toggle button (not a ComboBox)
          creatorVisibilityTrigger
        ) : (
          <GlobalTaskVisibility
            {...sharedProps}
            onChange={onChange?.visibility}
          />
        ))}

      {fields.release && (
        <GlobalTaskRelease
          {...sharedProps}
          releases={releases}
          onChange={onChange?.release}
          {...(style.useCustomTrigger
            ? { customTrigger: creatorReleaseTrigger }
            : {})}
        />
      )}

      {fields.vote && (
        <TaskVoting
          task={task}
          editable={editable}
          organizationId={task.organizationId}
          wsClientId={wsClientId}
          tasks={tasks}
          setTasks={setTasks ?? (() => {})}
          setSelectedTask={setSelectedTask ?? (() => {})}
          className={cn(
            style.useCustomTrigger ? "w-fit text-xs" : style.className,
            "bg-accent!",
          )}
        />
      )}

      {fields.identifier && organization && (
        <Link to={`/${task.organizationId}/tasks/${task.shortId}`} className="">
          <Button
            variant="ghost"
            className="border-transparent h-[26px] text-xs"
            size="sm"
          >
            <Avatar className="h-4 w-4 shrink-0">
              <AvatarImage
                src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
                alt={organization.name}
              />
              <AvatarFallback className="rounded-md uppercase text-[10px]">
                <IconUsers className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            {organization.slug}/#{task.shortId}
          </Button>
        </Link>
      )}
      {fields.githubIssue && task.githubIssue?.issueUrl && (
        <Link
          to={task.githubIssue.issueUrl}
          target="_blank"
          className="shrink-0"
        >
          <Button
            variant="primary"
            className="h-[26px] p-1 w-fit bg-accent text-xs"
            tooltipText="View linked GitHub issue"
            tooltipSide="bottom"
          >
            <IconBrandGithub className="size-4" /> Issue
          </Button>
        </Link>
      )}

      {fields.githubPr && task.githubPullRequest?.prUrl && (
        <Link
          to={task.githubPullRequest.prUrl}
          target="_blank"
          className="shrink-0"
        >
          <Button
            variant="primary"
            className="h-[26px] p-1 w-fit bg-accent text-xs"
            tooltipText="View linked GitHub PR"
            tooltipSide="bottom"
          >
            <IconGitMerge className="size-4" /> #
            {task.githubPullRequest.prNumber}
          </Button>
        </Link>
      )}
    </div>
  );
}

"use client";

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { TriStateCheckbox } from "@repo/ui/components/doras-ui/tri-state-checkbox";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { KanbanCard } from "@repo/ui/components/kibo-ui/kanban/index";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatDateCompact } from "@repo/util";
import {
  IconAppWindow,
  IconArrowRight,
  IconCategory,
  IconChevronUp,
  IconCircleFilled,
  IconExternalLink,
  IconRocket,
  IconTag,
  IconUser,
  IconUserOff,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";
import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import GlobalTaskAssignees from "../shared/assignee";
import { priorityConfig, statusConfig } from "../shared/config";
import { RenderLabel } from "../shared/label";
import GlobalTaskPriority from "../shared/priority";
import GlobalTaskStatus from "../shared/status";
import { RenderCategory, RenderRelease } from "../shared";
import RenderIcon from "@/components/generic/RenderIcon";
import { InlineLabel } from "../shared/inlinelabel";
import { Input } from "@repo/ui/components/input";
import { releaseStatusConfig } from "@/components/releases/config";

interface UnifiedTaskItemProps {
  task: schema.TaskWithLabels;
  viewMode: "list" | "kanban";

  // Data props
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  availableUsers: schema.userType[];
  availableLabels?: schema.labelType[];
  categories?: schema.categoryType[];
  releases?: schema.releaseType[];

  // Actions
  onTaskUpdate?: (
    taskId: string,
    updates: Partial<schema.TaskWithLabels>,
  ) => void;

  /** When provided, left-click opens the task via this callback instead of navigating */
  onTaskClick?: (task: schema.TaskWithLabels) => void;

  /** Explicit handler to open in dialog regardless of preference */
  onOpenInDialog?: (task: schema.TaskWithLabels) => void;

  // List View Specific
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  personal?: boolean;

  // Kanban View Specific
  columnId?: string;

  // Compact mode - hides checkboxes and simplifies layout
  compact?: boolean;
}

export function UnifiedTaskItem({
  task,
  viewMode,
  tasks,
  setTasks,
  availableUsers,
  availableLabels = [],
  categories = [],
  releases = [],
  onTaskUpdate,
  onTaskClick,
  onOpenInDialog,
  isSelected = false,
  onSelect,
  personal = false,
  columnId,
  compact = false,
}: UnifiedTaskItemProps) {
  const taskId = String(task.shortId);
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

  // DEBUG: Check task data structure
  // if (task.shortId === 22) {
  //   console.log('[UnifiedTaskItem #22] Task object:', task);
  //   console.log('[UnifiedTaskItem #22] task.releaseId:', task.releaseId);
  //   console.log('[UnifiedTaskItem #22] releases array:', releases);
  //   console.log('[UnifiedTaskItem #22] releases.length:', releases.length);
  //   const foundRelease = releases.find((r) => r.id === task.releaseId);
  //   console.log('[UnifiedTaskItem #22] Found release:', foundRelease);
  // }

  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [releaseSearch, setReleaseSearch] = useState("");
  const preventClickRef = useRef(false);

  // Consolidated task view state management
  const { applyFilter } = useTaskViewManager();

  const handleCategoryClick = (categoryId: string) => {
    preventClickRef.current = true;
    setTimeout(() => {
      preventClickRef.current = false;
    }, 200);

    const categoryFilter: FilterState = {
      groups: [
        {
          id: `category-${categoryId}-group`,
          operator: "AND",
          conditions: [
            {
              id: `category-any-${categoryId}`,
              field: "category",
              operator: "any",
              value: categoryId,
            },
          ],
        },
      ],
      operator: "AND",
    };
    applyFilter(categoryFilter);
  };

  const handleReleaseClick = (releaseId: string) => {
    preventClickRef.current = true;
    setTimeout(() => {
      preventClickRef.current = false;
    }, 200);

    const releaseFilter: FilterState = {
      groups: [
        {
          id: `release-${releaseId}-group`,
          operator: "AND",
          conditions: [
            {
              id: `release-any-${releaseId}`,
              field: "release",
              operator: "any",
              value: releaseId,
            },
          ],
        },
      ],
      operator: "AND",
    };
    applyFilter(releaseFilter);
  };

  // Check if any popover is currently open
  const hasOpenPopover =
    statusPopoverOpen || priorityPopoverOpen || assigneePopoverOpen;

  const handleStatusChange = (newStatus: string) => {
    preventClickRef.current = true;
    setStatusPopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
    onTaskUpdate?.(task.id, {
      status: newStatus as schema.TaskWithLabels["status"],
    });
  };

  const handleStatusPopoverChange = (open: boolean) => {
    setStatusPopoverOpen(open);
    if (!open) {
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 200);
    }
  };

  const handlePriorityChange = (newPriority: string) => {
    preventClickRef.current = true;
    setPriorityPopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
    onTaskUpdate?.(task.id, {
      priority: newPriority as schema.TaskWithLabels["priority"],
    });
  };

  const handlePriorityPopoverChange = (open: boolean) => {
    setPriorityPopoverOpen(open);
    if (!open) {
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 200);
    }
  };

  const handleAssigneeChange = (userIds: string[]) => {
    preventClickRef.current = true;
    setAssigneePopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
    const updatedAssignees = availableUsers.filter((user) =>
      userIds.includes(user.id),
    );
    onTaskUpdate?.(task.id, { assignees: updatedAssignees });
  };

  const handleAssigneePopoverChange = (open: boolean) => {
    setAssigneePopoverOpen(open);
    if (!open) {
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 200);
    }
  };

  // --- Link click handler that supports dialog mode ---
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let interactive sub-elements suppress navigation
    if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
      e.preventDefault();
      return;
    }
    if (preventClickRef.current) {
      e.preventDefault();
      preventClickRef.current = false;
      return;
    }
    // If onTaskClick is provided and this is a normal left-click (not ctrl/meta/middle-click),
    // intercept and open via the callback instead of navigating
    if (onTaskClick && !e.ctrlKey && !e.metaKey && e.button === 0) {
      e.preventDefault();
      onTaskClick(task);
    }
  };

  // --- Render Content based on View Mode ---

  // Compact List View - simplified for releases
  const renderCompactListContent = () => (
    <Link
      className={cn(
        "block cursor-pointer w-full text-left bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      to="/$orgId/tasks/$taskShortId"
      params={{ orgId: task.organizationId, taskShortId: taskId }}
      preload={false}
      onClick={handleLinkClick}
    >
      <div
        className={cn(
          "p-1 px-2 group/list-block h-10 max-h-10 relative flex gap-2 bg-transparent hover:bg-muted text-sm transition-colors flex-row items-center data-[state=open]:bg-accent",
          hasOpenPopover && "bg-accent",
          // task.status === "backlog" && "hover:bg-accent/15",
          // task.status === "todo" && "hover:bg-secondary/15",
          // task.status === "in-progress" && "hover:bg-primary/15",
          // task.status === "done" && "hover:bg-success/15",
        )}
      >
        {/* Left section - task ID, status, and title */}
        <div className="flex gap-2 w-full truncate">
          <div className="flex grow items-center gap-2 truncate">
            {/* Priority */}
            <GlobalTaskPriority
              task={task}
              editable={true}
              onChange={handlePriorityChange}
              useInternalLogic={true}
              tasks={tasks}
              setTasks={setTasks}
              open={priorityPopoverOpen}
              setOpen={handlePriorityPopoverChange}
              customTrigger={
                <button
                  type="button"
                  className="h-4 flex items-center gap-1.5 rounded text-xs p-0.5 cursor-pointer"
                  data-no-propagate
                >
                  {priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
                </button>
              }
            />

            {/* Title */}
            <p className="truncate cursor-pointer text-sm text-foreground w-fit">
              {task.title}
            </p>
          </div>
        </div>

        {/* Right section with metadata */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex flex-wrap grow shrink-0 items-center gap-2 whitespace-nowrap">
            {/* Category */}
            {task.category &&
              (() => {
                const category = categories.find((c) => c.id === task.category);
                return category ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCategoryClick(category.id);
                    }}
                    data-no-propagate
                    className="cursor-pointer"
                  >
                    <RenderCategory category={category} />
                  </button>
                ) : null;
              })()}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="hidden sm:flex h-5 gap-1 max-w-[300px] overflow-x-auto">
                {task.labels.slice(0, 2).map((label) => (
                  <RenderLabel
                    label={label}
                    key={label.id + nanoid(5)}
                    data-no-propagate
                  />
                ))}
                {task.labels.length > 2 && (
                  <Badge
                    variant="secondary"
                    className="flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    +{task.labels.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Assignees */}
            <GlobalTaskAssignees
              task={task}
              editable={true}
              availableUsers={availableUsers}
              onChange={handleAssigneeChange}
              useInternalLogic={true}
              tasks={tasks}
              setTasks={setTasks}
              open={assigneePopoverOpen}
              setOpen={handleAssigneePopoverChange}
              side="left"
              customTrigger={
                task.assignees && task.assignees.length > 0 ? (
                  <div
                    className="flex items-center cursor-pointer"
                    data-no-propagate
                  >
                    {task.assignees.length === 1 ? (
                      <Avatar className={cn("rounded-full h-5 w-5")}>
                        <AvatarImage
                          src={task.assignees[0]?.image || "/avatar.jpg"}
                          alt={task.assignees[0]?.name}
                        />
                        <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
                          {task.assignees[0]?.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee, index) => (
                          <Avatar
                            key={assignee.id + nanoid(5)}
                            className={cn(
                              "rounded-full h-5 w-5",
                              index > 0 && "relative",
                            )}
                            style={{ zIndex: task.assignees.length - index }}
                          >
                            <AvatarImage
                              src={assignee?.image || "/avatar.jpg"}
                              alt={assignee?.name}
                            />
                            <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
                              {assignee?.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="flex items-center justify-center rounded-full h-5 w-5 bg-muted border-2 border-background text-xs font-medium text-muted-foreground relative">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5 cursor-pointer"
                    data-no-propagate
                  >
                    <IconUserOff className="h-3 w-3 shrink-0" />
                  </div>
                )
              }
            />
          </div>
        </div>
      </div>
    </Link>
  );

  const renderListContent = () => (
    <Link
      className={cn(
        "block cursor-pointer w-full text-left bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      to="/$orgId/tasks/$taskShortId"
      params={{ orgId: task.organizationId, taskShortId: taskId }}
      preload={false}
      onClick={handleLinkClick}
    >
      <div
        className={cn(
          "px-2 pr-4 group/list-block h-11 max-h-11 relative flex gap-3 bg-transparent hover:bg-accent py-3 text-sm transition-colors flex-row items-center data-[state=open]:bg-accent",
          isSelected && "bg-primary/10",
          hasOpenPopover && "bg-accent",
        )}
      >
        {/* Left section with checkbox, task ID, and title */}
        <div className="flex gap-2 w-full truncate">
          <div className="flex grow items-center gap-1 truncate">
            <div className="flex items-center gap-1">
              {/* Checkbox */}
              <div className="shrink-0 grid place-items-center">
                <div className="relative shrink-0 flex">
                  <TriStateCheckbox
                    state={isSelected ? "all" : "none"}
                    onClick={() => onSelect?.(!isSelected)}
                    data-no-propagate
                    className={cn(
                      "opacity-0 pointer-events-none group-hover/list-block:opacity-100 group-hover/list-block:pointer-events-auto transition-opacity shrink-0 border-primary/30",
                      isSelected &&
                        "opacity-100 bg-primary/20 border-primary pointer-events-auto",
                      "group-active/context:opacity-100",
                    )}
                  />
                </div>
              </div>
              {/* Priority */}
              <GlobalTaskPriority
                task={task}
                editable={true}
                onChange={handlePriorityChange}
                useInternalLogic={true}
                tasks={tasks}
                setTasks={setTasks}
                open={priorityPopoverOpen}
                setOpen={handlePriorityPopoverChange}
                customTrigger={
                  <button
                    type="button"
                    className="h-4 flex items-center gap-1.5 rounded text-xs p-0.5 cursor-pointer ml-2"
                    data-no-propagate
                  >
                    {priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
                  </button>
                }
              />

              {/* Task ID */}
              <div className="shrink-0 min-w-9 w-9 max-w-9">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    #{task.shortId}
                  </span>
                </div>
              </div>
            </div>

            {/* Status dropdown */}
            <GlobalTaskStatus
              task={task}
              editable={true}
              onChange={handleStatusChange}
              useInternalLogic={true}
              tasks={tasks}
              setTasks={setTasks}
              open={statusPopoverOpen}
              setOpen={handleStatusPopoverChange}
              data-no-propagate
              customTrigger={
                <button
                  type="button"
                  className="size-4 grid place-items-center shrink-0 cursor-pointer"
                  data-no-propagate
                >
                  {status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)}
                </button>
              }
            />
            {personal && task.organization && (
              <Link to="/$orgId/tasks" params={{ orgId: task.organizationId }}>
                <Badge
                  data-no-propagate
                  variant="secondary"
                  className="flex items-center justify-center gap-1 bg-muted ps-0 text-xs h-5 border border-transparent rounded-2xl truncate cursor-pointer w-fit relative"
                >
                  <InlineLabel
                    image={task.organization.logo}
                    avatarClassName="bg-transparent"
                    text={task.organization.slug}
                  />
                </Badge>
              </Link>
            )}
            {/* Title */}
            <p className="truncate cursor-pointer text-sm text-foreground w-fit">
              {task.title}{" "}
            </p>
          </div>
        </div>
        {/* Right section with metadata and actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex flex-wrap grow shrink-0 items-center gap-2 whitespace-nowrap">
            {/* Organization (personal/cross-org mode) */}

            {/* Category */}
            {task.category &&
              (() => {
                const category = categories.find((c) => c.id === task.category);
                return category ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCategoryClick(category.id);
                    }}
                    data-no-propagate
                    className="cursor-pointer "
                  >
                    <RenderCategory category={category} />
                  </button>
                ) : null;
              })()}
            {/* Release */}
            {task.releaseId &&
              (() => {
                const release = releases.find((r) => r.id === task.releaseId);
                return release ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReleaseClick(release.id);
                    }}
                    data-no-propagate
                    className="cursor-pointer"
                  >
                    <RenderRelease release={release} />
                  </button>
                ) : null;
              })()}
            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="hidden sm:flex h-5 gap-1 max-w-[400px] overflow-x-auto">
                {task.labels.slice(0, 2).map((label) => (
                  <RenderLabel
                    label={label}
                    key={label.id + nanoid(5)}
                    data-no-propagate
                    className="max-w-20"
                  />
                ))}
                {task.labels.length > 2 && (
                  <Badge
                    variant="secondary"
                    className="flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="flex -space-x-1.5">
                      {task.labels.slice(2).map((label) => (
                        <IconCircleFilled
                          key={label.id + nanoid(5)}
                          className="h-3 w-3"
                          style={{
                            color: label.color || "var(--foreground)",
                          }}
                        />
                      ))}
                    </div>
                    +{task.labels.length - 2}
                  </Badge>
                )}
              </div>
            )}
            {/* Assignees */}
            <GlobalTaskAssignees
              task={task}
              editable={true}
              availableUsers={availableUsers}
              onChange={handleAssigneeChange}
              useInternalLogic={true}
              tasks={tasks}
              setTasks={setTasks}
              open={assigneePopoverOpen}
              setOpen={handleAssigneePopoverChange}
              side="left"
              customTrigger={
                task.assignees && task.assignees.length > 0 ? (
                  <div
                    className="flex items-center cursor-pointer"
                    data-no-propagate
                  >
                    {task.assignees.length === 1 ? (
                      <Avatar className={cn("rounded-full h-5 w-5")}>
                        <AvatarImage
                          src={task.assignees[0]?.image || "/avatar.jpg"}
                          alt={task.assignees[0]?.name}
                        />
                        <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
                          {task.assignees[0]?.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee, index) => (
                          <Avatar
                            key={assignee.id + nanoid(5)}
                            className={cn(
                              "rounded-full h-5 w-5",
                              index > 0 && "relative",
                            )}
                            style={{ zIndex: task.assignees.length - index }}
                          >
                            <AvatarImage
                              src={assignee?.image || "/avatar.jpg"}
                              alt={assignee?.name}
                            />
                            <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
                              {assignee?.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="flex items-center justify-center rounded-full h-5 w-5 bg-muted border-2 border-background text-xs font-medium text-muted-foreground relative">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5 cursor-pointer"
                    data-no-propagate
                  >
                    <IconUserOff className="h-3 w-3 shrink-0" />
                  </div>
                )
              }
            />
            <span className="text-xs text-muted-foreground truncate hidden xl:flex">
              {formatDateCompact(task.createdAt as Date)}
            </span>
            <div className="flex items-center text-muted-foreground">
              <IconChevronUp className="h-3 w-3 shrink-0" />
              <span className="text-xs truncate">
                {formatCount(task.voteCount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  const renderKanbanContent = () => (
    <Link
      className="flex flex-col gap-2 h-full w-full text-left"
      to="/$orgId/tasks/$taskShortId"
      params={{ orgId: task.organizationId, taskShortId: taskId }}
      preload={false}
      onClick={handleLinkClick}
    >
      <div className="flex items-start gap-2 w-full">
        <Label variant={"description"}>#{task.shortId}</Label>
        <div className="flex items-center ml-auto gap-1">
          <GlobalTaskStatus
            task={task}
            editable={true}
            onChange={handleStatusChange}
            useInternalLogic={true}
            tasks={tasks}
            setTasks={setTasks}
            open={statusPopoverOpen}
            setOpen={handleStatusPopoverChange}
            data-no-propagate
            customTrigger={
              <div
                className={cn(
                  "flex items-center gap-1 border-0 px-1.5 py-0.5 rounded-full bg-transparent text-accent-foreground cursor-pointer",
                  status?.className,
                )}
                data-no-propagate
              >
                {status?.icon("w-4 h-4")}
              </div>
            }
          />

          <GlobalTaskPriority
            task={task}
            editable={true}
            onChange={handlePriorityChange}
            useInternalLogic={true}
            tasks={tasks}
            setTasks={setTasks}
            open={priorityPopoverOpen}
            setOpen={handlePriorityPopoverChange}
            customTrigger={
              <div
                className={cn(
                  "p-1 rounded bg-transparent cursor-pointer",
                  priority?.className,
                )}
                title={priority?.label}
                data-no-propagate
              >
                {priority?.icon("w-4 h-4")}
              </div>
            }
          />
        </div>
      </div>
      <div className="font-medium text-xs line-clamp-2 leading-tight">
        {task.title}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {task.labels.slice(0, 3).map((label) => (
            <RenderLabel
              key={label.id}
              label={label}
              className="max-w-[100px]"
              data-no-propagate
            />
          ))}
          {task.labels.length > 3 && (
            <Badge variant="secondary" className="text-xs h-5 px-1">
              +{task.labels.length - 3}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-1">
          {task.category &&
            (() => {
              const category = categories.find((c) => c.id === task.category);
              return category ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCategoryClick(category.id);
                  }}
                  data-no-propagate
                  className="cursor-pointer"
                >
                  <RenderCategory category={category} />
                </button>
              ) : null;
            })()}
          {task.releaseId &&
            (() => {
              const release = releases.find((r) => r.id === task.releaseId);
              return release ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReleaseClick(release.id);
                  }}
                  data-no-propagate
                  className="cursor-pointer"
                >
                  <RenderRelease release={release} />
                </button>
              ) : null;
            })()}
        </div>
        <GlobalTaskAssignees
          task={task}
          editable={true}
          availableUsers={availableUsers}
          onChange={handleAssigneeChange}
          useInternalLogic={true}
          tasks={tasks}
          setTasks={setTasks}
          open={assigneePopoverOpen}
          setOpen={handleAssigneePopoverChange}
          side="left"
          customTrigger={
            task.assignees && task.assignees.length > 0 ? (
              <div className="flex -space-x-2 cursor-pointer" data-no-propagate>
                {task.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-5 w-5">
                    <AvatarImage src={assignee.image || undefined} />
                    <AvatarFallback className="text-[8px]">
                      {assignee.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5 cursor-pointer"
                data-no-propagate
              >
                <IconUserOff className="h-3 w-3 shrink-0" />
              </div>
            )
          }
        />
      </div>
    </Link>
  );

  const contextMenuContent = (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel className="truncate">
        #{task.shortId} - {task.title}
      </ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-3 w-full">
          <IconArrowRight className="size-3.5 -rotate-45" /> Open in
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-44">
          <ContextMenuGroup>
            <Link
              to="/$orgId/tasks/$taskShortId"
              params={{ orgId: task.organizationId, taskShortId: taskId }}
            >
              <ContextMenuItem className="gap-3 w-full">
                <IconExternalLink className="size-4" />
                Page
              </ContextMenuItem>
            </Link>
            {onOpenInDialog && (
              <ContextMenuItem
                className="gap-3 w-full"
                onClick={() => onOpenInDialog(task)}
              >
                <IconAppWindow className="size-4" />
                Window
              </ContextMenuItem>
            )}
          </ContextMenuGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-3 w-full">
          {priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)} Priority
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-44">
          <ContextMenuLabel>Set Priority</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup
            value={task.priority || "none"}
            onValueChange={(value) => handlePriorityChange(value)}
          >
            {Object.entries(priorityConfig).map(([key, config]) => (
              <ContextMenuRadioItem key={key} value={key} showDot={false}>
                <div className="flex items-center gap-2">
                  {config?.icon(`h-3.5 w-3.5 ${config?.className || ""}`)}
                  <span>{config.label}</span>
                </div>
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-3 w-full">
          {status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)} Status
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-44">
          <ContextMenuLabel>Set Status</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuRadioGroup
            value={task.status || "backlog"}
            onValueChange={(value) => handleStatusChange(value)}
          >
            {Object.entries(statusConfig).map(([key, config]) => (
              <ContextMenuRadioItem key={key} value={key} showDot={false}>
                <div className="flex items-center gap-2">
                  {config?.icon(`h-3.5 w-3.5 ${config?.className || ""}`)}
                  <span>{config.label}</span>
                </div>
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-3 w-full">
          <IconUser className="size-3.5" />
          Assigned
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto pt-0">
          <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
            <Input
              variant={"ghost"}
              className="w-full p-3 border-b rounded-none"
              placeholder="Search users..."
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {availableUsers.length > 0 ? (
            availableUsers
              .filter((user) =>
                user.name.toLowerCase().includes(assigneeSearch.toLowerCase()),
              )
              .sort((a, b) => {
                const aAssigned =
                  task.assignees?.some((assignee) => assignee.id === a.id) ??
                  false;
                const bAssigned =
                  task.assignees?.some((assignee) => assignee.id === b.id) ??
                  false;
                return Number(bAssigned) - Number(aAssigned);
              })
              .map((user) => {
                const isAssigned =
                  task.assignees?.some((assignee) => assignee.id === user.id) ||
                  false;
                return (
                  <ContextMenuCheckboxItem
                    key={user.id}
                    checked={isAssigned}
                    side="right"
                    onSelect={(e) => {
                      e.preventDefault();
                      const currentAssigneeIds =
                        task.assignees?.map((a) => a.id) || [];
                      const newAssigneeIds = isAssigned
                        ? currentAssigneeIds.filter((id) => id !== user.id)
                        : [...currentAssigneeIds, user.id];
                      handleAssigneeChange(newAssigneeIds);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={user.image || undefined}
                          alt={user.name}
                        />
                        <AvatarFallback className="text-xs">
                          {user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name}</span>
                    </div>
                  </ContextMenuCheckboxItem>
                );
              })
          ) : (
            <ContextMenuItem disabled>No users available</ContextMenuItem>
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-3 w-full">
          <IconTag className="size-3.5" />
          Labels
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto pt-0">
          <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
            <Input
              variant={"ghost"}
              className="w-full p-3 border-b rounded-none"
              placeholder="Search labels..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {availableLabels.length > 0 ? (
            availableLabels
              .filter((label) =>
                label.name.toLowerCase().includes(labelSearch.toLowerCase()),
              )
              .sort((a, b) => {
                const aApplied =
                  task.labels?.some((l) => l.id === a.id) ?? false;
                const bApplied =
                  task.labels?.some((l) => l.id === b.id) ?? false;
                return Number(bApplied) - Number(aApplied);
              })
              .map((label) => {
                const isApplied =
                  task.labels?.some((l) => l.id === label.id) || false;
                return (
                  <ContextMenuCheckboxItem
                    key={label.id}
                    checked={isApplied}
                    side="right"
                    onSelect={(e) => {
                      e.preventDefault();
                      const currentLabelIds =
                        task.labels?.map((l) => l.id) || [];
                      const newLabelIds = isApplied
                        ? currentLabelIds.filter((id) => id !== label.id)
                        : [...currentLabelIds, label.id];
                      const newLabels = availableLabels.filter((l) =>
                        newLabelIds.includes(l.id),
                      );
                      onTaskUpdate?.(task.id, { labels: newLabels });
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <IconCircleFilled
                        className="h-3 w-3 shrink-0"
                        style={{ color: label.color || "var(--foreground)" }}
                      />
                      <span className="text-sm truncate">{label.name}</span>
                    </div>
                  </ContextMenuCheckboxItem>
                );
              })
          ) : (
            <ContextMenuItem disabled>No labels available</ContextMenuItem>
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {categories.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            <IconCategory className="size-3.5" />
            Category
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52 max-h-60 overflow-y-auto pt-0">
            <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
              <Input
                variant={"ghost"}
                className="w-full p-3 border-b rounded-none"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <ContextMenuRadioGroup
              value={task.category || ""}
              onValueChange={(value) =>
                onTaskUpdate?.(task.id, { category: value || null })
              }
            >
              {categories
                .filter((category) =>
                  category.name
                    .toLowerCase()
                    .includes(categorySearch.toLowerCase()),
                )
                .sort((a, b) => {
                  const aSelected = task.category === a.id;
                  const bSelected = task.category === b.id;
                  return Number(bSelected) - Number(aSelected);
                })
                .map((category) => (
                  <ContextMenuRadioItem
                    key={category.id}
                    value={category.id}
                    showDot={false}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      <RenderIcon
                        iconName={category.icon || "IconCategory"}
                        size={14}
                        color={category.color || undefined}
                        raw
                      />
                      <span>{category.name}</span>
                    </div>
                  </ContextMenuRadioItem>
                ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {releases.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            <IconRocket className="size-3.5" />
            Release
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-72 max-h-60 overflow-y-auto pt-0">
            <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
              <Input
                variant={"ghost"}
                className="w-full p-3 border-b rounded-none"
                placeholder="Search releases..."
                value={releaseSearch}
                onChange={(e) => setReleaseSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <ContextMenuRadioGroup
              value={task.releaseId || ""}
              onValueChange={(value) =>
                onTaskUpdate?.(task.id, { releaseId: value || null })
              }
            >
              {releases
                .filter((release) =>
                  release.name
                    .toLowerCase()
                    .includes(releaseSearch.toLowerCase()),
                )
                .sort((a, b) => {
                  const aSelected = task.releaseId === a.id;
                  const bSelected = task.releaseId === b.id;
                  return Number(bSelected) - Number(aSelected);
                })
                .map((release) => (
                  <ContextMenuRadioItem
                    key={release.id}
                    value={release.id}
                    showDot={false}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2 w-full truncate">
                      {release.icon ? (
                        <div className="shrink-0">
                          <RenderIcon
                            iconName={release.icon}
                            size={14}
                            color={release.color || undefined}
                            raw
                          />
                        </div>
                      ) : (
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: release.color || "#cccccc",
                          }}
                        />
                      )}
                      <span className="truncate">{release.name}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Badge className="rounded-lg text-xs cursor-pointer gap-1.5 truncate max-w-20 bg-secondary pointer-events-none">
                          {release.slug}
                        </Badge>
                        <Badge
                          className={cn(
                            "border rounded-lg text-xs cursor-pointer gap-1.5 shrink-0",
                            releaseStatusConfig[release.status].badgeClassName,
                          )}
                        >
                          {releaseStatusConfig[release.status].icon("w-3 h-3")}
                          {releaseStatusConfig[release.status].label}
                        </Badge>
                      </div>
                    </div>
                  </ContextMenuRadioItem>
                ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
    </ContextMenuContent>
  );

  // Early return for compact mode
  if (compact && viewMode === "list") {
    return (
      <ContextMenu>
        <ContextMenuTrigger
          className="relative select-none group/context data-[state=open]:bg-accent"
          asChild
        >
          {renderCompactListContent()}
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>
    );
  }

  if (viewMode === "kanban") {
    return (
      <KanbanCard
        id={task.id}
        name={task.title || "Untitled"}
        column={columnId || ""}
        className="bg-accent p-2 rounded-lg border-transparent shadow-sm hover:bg-secondary transition-colors cursor-pointer flex flex-col gap-2"
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {renderKanbanContent()}
          </ContextMenuTrigger>
          {contextMenuContent}
        </ContextMenu>
      </KanbanCard>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="relative select-none group/context data-[state=open]:bg-accent"
        asChild
      >
        {renderListContent()}
      </ContextMenuTrigger>
      {contextMenuContent}
    </ContextMenu>
  );
}

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
import { extractHslValues, formatCount, formatDateCompact } from "@repo/util";
import {
  IconAppWindow,
  IconArrowRight,
  IconCategory,
  IconChevronUp,
  IconCircleFilled,
  IconExternalLink,
  IconGitBranch,
  IconLink,
  IconLock,
  IconLockFilled,
  IconRocket,
  IconTag,
  IconUser,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { useMemo, useRef, useState } from "react";
import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import GlobalTaskAssignees from "../shared/assignee";
import { priorityConfig, statusConfig } from "../shared/config";
import GlobalTaskPriority from "../shared/priority";
import GlobalTaskStatus from "../shared/status";
import type { FieldPermissions } from "../shared/task-field-toolbar-types";
import { SubtaskProgressBadge } from "../shared/subtask-progress";
import { InlineLabel } from "../shared/inlinelabel";
import { Input } from "@repo/ui/components/input";
import { releaseStatusConfig } from "@/components/releases/config";
import {
  getStatusOptions,
  getPriorityOptions,
  getAssigneeOptionsFromUsers,
  getLabelOptions,
  getCategoryOptions,
  getReleaseOptions,
  getParentOptions,
  getRelationTypeOptions,
  getRelationTargetOptions,
} from "../actions";
import {
  AssigneeAvatarTrigger,
  CategoryBadgeButton,
  ReleaseBadgeButton,
  TaskLabelsInline,
} from "./unified-task-item-parts";

interface UnifiedTaskItemProps {
  task: schema.TaskWithLabels;
  viewMode: "list" | "kanban";
  overviewLayout?: boolean;
  className?: string;

  // Data props
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  availableUsers: schema.userType[];
  availableLabels?: schema.labelType[];
  categories?: schema.categoryType[];
  releases?: schema.releaseType[];

  /** Per-field editability flags based on the current user's permissions. */
  fieldPermissions?: FieldPermissions;

  // Actions
  onTaskUpdate?: (
    taskId: string,
    updates: Partial<schema.TaskWithLabels>,
  ) => void;

  /** When provided, left-click opens the task via this callback instead of navigating */
  onTaskClick?: (task: schema.TaskWithLabels) => void;

  /** Explicit handler to open in dialog regardless of preference */
  onOpenInDialog?: (task: schema.TaskWithLabels) => void;

  /** Handler to add a relation between two tasks */
  onAddRelation?: (
    sourceTaskId: string,
    targetTaskId: string,
    type: "related" | "blocking" | "duplicate",
  ) => void;

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
  fieldPermissions,
  onTaskUpdate,
  onTaskClick,
  onOpenInDialog,
  onAddRelation,
  isSelected = false,
  onSelect,
  personal = false,
  columnId,
  compact = false,
  overviewLayout = false,
  className = "",
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
  const [parentSearch, setParentSearch] = useState("");
  const [blockingSearch, setBlockingSearch] = useState("");
  const [relatedSearch, setRelatedSearch] = useState("");
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const preventClickRef = useRef(false);

  // Consolidated task view state management
  const { applyFilter } = useTaskViewManager();

  // Derive subtask progress from the full tasks array (children have parentId set)
  const subtaskProgress = useMemo(() => {
    const childTasks = tasks.filter((t) => t.parentId === task.id);
    const total = childTasks.length;
    if (total === 0) return null;
    const completed = childTasks.filter(
      (t) => t.status === "done" || t.status === "canceled",
    ).length;
    return { completed, total };
  }, [task.id, tasks]);

  // Resolve parent task from the tasks array when this task is a subtask
  const parentTask = useMemo(() => {
    if (!task.parentId) return null;
    return tasks.find((t) => t.id === task.parentId) ?? null;
  }, [task.parentId, tasks]);

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

  const handleStatusChange = (_newStatus: string) => {
    preventClickRef.current = true;
    setStatusPopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
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

  const handlePriorityChange = (_newPriority: string) => {
    preventClickRef.current = true;
    setPriorityPopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
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

  const handleAssigneeChange = (_userIds: string[]) => {
    preventClickRef.current = true;
    setAssigneePopoverOpen(false);
    setTimeout(() => {
      preventClickRef.current = false;
    }, 500);
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
        // className,
      )}
      to="/$orgId/tasks/$taskShortId"
      params={{ orgId: task.organizationId, taskShortId: taskId }}
      preload={false}
      onClick={handleLinkClick}
    >
      <div
        className={cn(
          "p-1 px-2 group/list-block h-10 max-h-10 relative flex gap-2 bg-transparent hover:bg-muted text-sm transition-colors flex-row items-center data-[state=open]:bg-accent",
          className,
          hasOpenPopover && "bg-accent",
          // task.status === "backlog" && "hover:bg-accent/15",
          // task.status === "todo" && "hover:bg-secondary/15",
          // task.status === "in-progress" && "hover:bg-primary/15",
          // task.status === "done" && "hover:bg-success/15",
        )}
        style={{
          border: `1px solid hsla(${extractHslValues(status.hsla || "#404040")}, 0.5)`,
        }}
      >
        {/* Left section - task ID, status, and title */}
        <div className="flex gap-2 w-full truncate">
          <div className="flex grow items-center gap-2 truncate">
            {/* Priority */}
            <GlobalTaskPriority
              task={task}
              editable={fieldPermissions?.priority ?? true}
              onChange={handlePriorityChange}
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
            <div className="shrink-0 w-24 min-w-24">
              <GlobalTaskStatus
                task={task}
                editable={fieldPermissions?.status ?? true}
                onChange={handleStatusChange}
                tasks={tasks}
                setTasks={setTasks}
                open={statusPopoverOpen}
                setOpen={handleStatusPopoverChange}
                data-no-propagate
                customTrigger={
                  <Badge
                    variant={"outline"}
                    // className="h-4 place-items-center shrink-0 cursor-pointer flex items-center"
                    className={
                      (cn(
                        statusConfig[task.status as keyof typeof statusConfig]
                          .className,
                      ),
                      "px-0 h-5")
                    }
                    data-no-propagate
                  >
                    <InlineLabel
                      text={status.label}
                      icon={status.icon(
                        `h-3.5 w-3.5 ${status?.className || ""}`,
                      )}
                      className="pe-2"
                    />
                    {/*{status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)}
                  {status.label}*/}
                  </Badge>
                }
              />
            </div>

            <div className="shrink-0 max-w-9">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  #{task.shortId}
                </span>
              </div>
            </div>
            {/* Title */}
            <p className="truncate cursor-pointer text-sm text-foreground w-fit">
              {parentTask ? (
                <span>
                  {task.title}
                  <span className="text-muted-foreground">
                    <span className="mx-1">&rsaquo;</span>
                    {parentTask.title}
                  </span>
                </span>
              ) : (
                task.title
              )}
            </p>
          </div>
        </div>

        {/* Right section with metadata */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex flex-wrap grow shrink-0 items-center gap-2 whitespace-nowrap">
            {/* Category */}
            <CategoryBadgeButton
              categoryId={task.category}
              categories={categories}
              onClick={handleCategoryClick}
            />

            {/* Labels */}
            <TaskLabelsInline
              labels={task.labels || []}
              maxVisible={1}
              className="hidden sm:flex h-5 gap-1 max-w-[300px] overflow-x-auto"
              overflowStyle="count"
            />

            {/* Assignees */}
            <GlobalTaskAssignees
              task={task}
              editable={fieldPermissions?.assignees ?? true}
              availableUsers={availableUsers}
              onChange={handleAssigneeChange}
              tasks={tasks}
              setTasks={setTasks}
              open={assigneePopoverOpen}
              setOpen={handleAssigneePopoverChange}
              side="left"
              customTrigger={
                <AssigneeAvatarTrigger assignees={task.assignees || []} />
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
                editable={fieldPermissions?.priority ?? true}
                onChange={handlePriorityChange}
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
              editable={fieldPermissions?.status ?? true}
              onChange={handleStatusChange}
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
            <p className="truncate cursor-pointer text-sm text-foreground w-fit flex items-center">
              {task.visible === "private" && (
                <span className="text-primary">
                  <IconLock className="size-3.5 mr-1" />
                </span>
              )}
              {parentTask ? (
                <span>
                  {task.title}
                  <span className="text-muted-foreground">
                    <span className="mx-1">&rsaquo;</span>
                    {parentTask.title}
                  </span>
                </span>
              ) : (
                task.title
              )}
              {/*{task.title}{" "}*/}
            </p>
          </div>
        </div>
        {/* Right section with metadata and actions */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex flex-wrap grow shrink-0 items-center gap-2 whitespace-nowrap">
            {subtaskProgress && (
              <SubtaskProgressBadge
                completed={subtaskProgress.completed}
                total={subtaskProgress.total}
              />
            )}
            {/* Organization (personal/cross-org mode) */}

            {/* Category */}
            <CategoryBadgeButton
              categoryId={task.category}
              categories={categories}
              onClick={handleCategoryClick}
            />
            {/* Release */}
            <ReleaseBadgeButton
              releaseId={task.releaseId}
              releases={releases}
              onClick={handleReleaseClick}
            />
            {/* Labels */}
            <TaskLabelsInline
              labels={task.labels || []}
              maxVisible={2}
              className="hidden sm:flex h-5 gap-1 max-w-[400px] overflow-x-auto"
              labelClassName="max-w-20"
              overflowStyle="dots"
            />
            {/* Assignees */}
            <GlobalTaskAssignees
              task={task}
              editable={fieldPermissions?.assignees ?? true}
              availableUsers={availableUsers}
              onChange={handleAssigneeChange}
              tasks={tasks}
              setTasks={setTasks}
              open={assigneePopoverOpen}
              setOpen={handleAssigneePopoverChange}
              side="left"
              customTrigger={
                <AssigneeAvatarTrigger assignees={task.assignees || []} />
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
            editable={fieldPermissions?.status ?? true}
            onChange={handleStatusChange}
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
            editable={fieldPermissions?.priority ?? true}
            onChange={handlePriorityChange}
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
        {parentTask ? (
          <span>
            {task.title}
            <span className="text-muted-foreground font-normal">
              <span className="mx-0.5">&rsaquo;</span>
              {parentTask.title}
            </span>
          </span>
        ) : (
          task.title
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <TaskLabelsInline
          labels={task.labels}
          maxVisible={3}
          className="flex flex-wrap gap-1 mt-1"
          labelClassName="max-w-[100px]"
          overflowStyle="count"
        />
      )}

      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-1">
          {subtaskProgress && (
            <SubtaskProgressBadge
              completed={subtaskProgress.completed}
              total={subtaskProgress.total}
            />
          )}
          <CategoryBadgeButton
            categoryId={task.category}
            categories={categories}
            onClick={handleCategoryClick}
          />
          <ReleaseBadgeButton
            releaseId={task.releaseId}
            releases={releases}
            onClick={handleReleaseClick}
          />
        </div>
        <GlobalTaskAssignees
          task={task}
          editable={fieldPermissions?.assignees ?? true}
          availableUsers={availableUsers}
          onChange={handleAssigneeChange}
          tasks={tasks}
          setTasks={setTasks}
          open={assigneePopoverOpen}
          setOpen={handleAssigneePopoverChange}
          side="left"
          customTrigger={
            <AssigneeAvatarTrigger assignees={task.assignees || []} />
          }
        />
      </div>
    </Link>
  );

  // --- Memoised option lists from the action system (single source of truth) ---
  const priorityOptions = useMemo(() => getPriorityOptions(), []);
  const statusOptions = useMemo(() => getStatusOptions(), []);
  const assigneeOptions = useMemo(
    () => getAssigneeOptionsFromUsers(availableUsers),
    [availableUsers],
  );
  const labelOptions = useMemo(
    () => getLabelOptions(availableLabels),
    [availableLabels],
  );
  const categoryOptions = useMemo(
    () => getCategoryOptions(categories),
    [categories],
  );
  const releaseOptions = useMemo(() => getReleaseOptions(releases), [releases]);
  const parentOptions = useMemo(
    () => getParentOptions(task, tasks),
    [task, tasks],
  );
  const relationTypeOptions = useMemo(() => getRelationTypeOptions(), []);
  const relationTargetOptions = useMemo(
    () => getRelationTargetOptions(task, tasks),
    [task, tasks],
  );

  // Per-relation-type search state (fixes shared-state filtering bug)
  const relationSearchState: Record<string, [string, (v: string) => void]> = {
    blocking: [blockingSearch, setBlockingSearch],
    related: [relatedSearch, setRelatedSearch],
    duplicate: [duplicateSearch, setDuplicateSearch],
  };

  const contextMenuContent = (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel className="truncate">
        #{task.shortId} - {task.title}
      </ContextMenuLabel>
      <ContextMenuSeparator />

      {/* Open in */}
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

      {/* Priority */}
      {(fieldPermissions?.priority ?? true) && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            {priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}{" "}
            Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuLabel>Set Priority</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup
              value={task.priority || "none"}
              onValueChange={(value) => {
                onTaskUpdate?.(task.id, {
                  priority: (value === "none"
                    ? null
                    : value) as typeof task.priority,
                });
              }}
            >
              {priorityOptions.map((opt) => (
                <ContextMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  showDot={false}
                >
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Status */}
      {(fieldPermissions?.status ?? true) && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            {status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)} Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuLabel>Set Status</ContextMenuLabel>
            <ContextMenuSeparator />
            <ContextMenuRadioGroup
              value={task.status || "backlog"}
              onValueChange={(value) => {
                onTaskUpdate?.(task.id, {
                  status: value as typeof task.status,
                });
              }}
            >
              {statusOptions.map((opt) => (
                <ContextMenuRadioItem
                  key={opt.id}
                  value={opt.id}
                  showDot={false}
                >
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Assignees */}
      {(fieldPermissions?.assignees ?? true) && (
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
            {assigneeOptions.length > 0 ? (
              assigneeOptions
                .filter((opt) =>
                  opt.label
                    .toLowerCase()
                    .includes(assigneeSearch.toLowerCase()),
                )
                .sort((a, b) => {
                  const aAssigned =
                    task.assignees?.some((x) => x.id === a.id) ?? false;
                  const bAssigned =
                    task.assignees?.some((x) => x.id === b.id) ?? false;
                  return Number(bAssigned) - Number(aAssigned);
                })
                .map((opt) => {
                  const isAssigned =
                    task.assignees?.some((x) => x.id === opt.id) ?? false;
                  return (
                    <ContextMenuCheckboxItem
                      key={opt.id}
                      checked={isAssigned}
                      side="right"
                      onSelect={(e) => {
                        e.preventDefault();
                        const currentIds =
                          task.assignees?.map((a) => a.id) || [];
                        const newIds = isAssigned
                          ? currentIds.filter((id) => id !== opt.id)
                          : [...currentIds, opt.id];
                        const newAssignees = availableUsers
                          .filter((u) => newIds.includes(u.id))
                          .map((u) => ({
                            id: u.id,
                            name: u.name,
                            image: u.image,
                          }));
                        onTaskUpdate?.(task.id, { assignees: newAssignees });
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={opt.metadata?.image || undefined}
                            alt={opt.label}
                          />
                          <AvatarFallback className="text-xs">
                            {opt.label
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{opt.label}</span>
                      </div>
                    </ContextMenuCheckboxItem>
                  );
                })
            ) : (
              <ContextMenuItem disabled>No users available</ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Labels */}
      {(fieldPermissions?.labels ?? true) && (
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
            {labelOptions.length > 0 ? (
              labelOptions
                .filter((opt) =>
                  opt.label.toLowerCase().includes(labelSearch.toLowerCase()),
                )
                .sort((a, b) => {
                  const aApplied =
                    task.labels?.some((l) => l.id === a.id) ?? false;
                  const bApplied =
                    task.labels?.some((l) => l.id === b.id) ?? false;
                  return Number(bApplied) - Number(aApplied);
                })
                .map((opt) => {
                  const isApplied =
                    task.labels?.some((l) => l.id === opt.id) ?? false;
                  return (
                    <ContextMenuCheckboxItem
                      key={opt.id}
                      checked={isApplied}
                      side="right"
                      onSelect={(e) => {
                        e.preventDefault();
                        const currentIds = task.labels?.map((l) => l.id) || [];
                        const newIds = isApplied
                          ? currentIds.filter((id) => id !== opt.id)
                          : [...currentIds, opt.id];
                        const newLabels = availableLabels.filter((l) =>
                          newIds.includes(l.id),
                        );
                        onTaskUpdate?.(task.id, { labels: newLabels });
                      }}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <IconCircleFilled
                          className="h-3 w-3 shrink-0"
                          style={{
                            color: opt.metadata?.color || "var(--foreground)",
                          }}
                        />
                        <span className="text-sm truncate">{opt.label}</span>
                      </div>
                    </ContextMenuCheckboxItem>
                  );
                })
            ) : (
              <ContextMenuItem disabled>No labels available</ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Category */}
      {(fieldPermissions?.category ?? true) && (
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
              value={task.category || "none"}
              onValueChange={(value) =>
                onTaskUpdate?.(task.id, {
                  category: value === "none" ? null : value,
                })
              }
            >
              {categoryOptions
                .filter((opt) =>
                  opt.label
                    .toLowerCase()
                    .includes(categorySearch.toLowerCase()),
                )
                .sort((a, b) => {
                  // Keep "No Category" at top, then sort selected first
                  if (a.id === "none") return -1;
                  if (b.id === "none") return 1;
                  const aSelected = task.category === a.id;
                  const bSelected = task.category === b.id;
                  return Number(bSelected) - Number(aSelected);
                })
                .map((opt) => (
                  <ContextMenuRadioItem
                    key={opt.id}
                    value={opt.value ?? "none"}
                    showDot={false}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  </ContextMenuRadioItem>
                ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Release */}
      {(fieldPermissions?.release ?? true) && (
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
              value={task.releaseId || "none"}
              onValueChange={(value) =>
                onTaskUpdate?.(task.id, {
                  releaseId: value === "none" ? null : value,
                })
              }
            >
              {releaseOptions
                .filter((opt) =>
                  opt.label.toLowerCase().includes(releaseSearch.toLowerCase()),
                )
                .sort((a, b) => {
                  // Keep "No Release" at top, then sort selected first
                  if (a.id === "none") return -1;
                  if (b.id === "none") return 1;
                  const aSelected = task.releaseId === a.id;
                  const bSelected = task.releaseId === b.id;
                  return Number(bSelected) - Number(aSelected);
                })
                .map((opt) => {
                  const meta = opt.metadata;
                  return (
                    <ContextMenuRadioItem
                      key={opt.id}
                      value={opt.value ?? "none"}
                      showDot={false}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-2 w-full truncate">
                        {opt.icon}
                        <span className="truncate">{opt.label}</span>
                        {meta && (
                          <div className="flex items-center gap-1 ml-auto">
                            <Badge className="rounded-lg text-xs cursor-pointer gap-1.5 truncate max-w-20 bg-secondary pointer-events-none">
                              {meta.slug}
                            </Badge>
                            <Badge
                              className={cn(
                                "border rounded-lg text-xs cursor-pointer gap-1.5 shrink-0",
                                releaseStatusConfig[
                                  meta.status as keyof typeof releaseStatusConfig
                                ]?.badgeClassName,
                              )}
                            >
                              {releaseStatusConfig[
                                meta.status as keyof typeof releaseStatusConfig
                              ]?.icon("w-3 h-3")}
                              {
                                releaseStatusConfig[
                                  meta.status as keyof typeof releaseStatusConfig
                                ]?.label
                              }
                            </Badge>
                          </div>
                        )}
                      </div>
                    </ContextMenuRadioItem>
                  );
                })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {(fieldPermissions?.parent ?? true) && <ContextMenuSeparator />}

      {/* Parent task */}
      {(fieldPermissions?.parent ?? true) && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            <IconGitBranch className="size-3.5" /> Parent task
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64 max-h-60 overflow-y-auto pt-0">
            <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
              <Input
                variant={"ghost"}
                className="w-full p-3 border-b rounded-none"
                placeholder="Search tasks..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <ContextMenuRadioGroup
              value={task.parentId || "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  onTaskUpdate?.(task.id, { parentId: null, parent: null });
                } else {
                  const selectedParent = tasks.find((t) => t.id === value);
                  if (selectedParent) {
                    onTaskUpdate?.(task.id, {
                      parentId: selectedParent.id,
                      parent: {
                        id: selectedParent.id,
                        shortId: selectedParent.shortId,
                        title: selectedParent.title,
                        status: selectedParent.status,
                      },
                    });
                  }
                }
              }}
            >
              {parentOptions
                .filter(
                  (opt) =>
                    parentSearch === "" ||
                    opt.label
                      .toLowerCase()
                      .includes(parentSearch.toLowerCase()) ||
                    (opt.keywords || "").includes(parentSearch),
                )
                .slice(0, 21) // 1 for "No Parent" + 20 tasks
                .map((opt) => (
                  <ContextMenuRadioItem
                    key={opt.id}
                    value={opt.value ?? "none"}
                    showDot={false}
                    className={
                      opt.id === "none" ? "text-muted-foreground" : undefined
                    }
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </div>
                  </ContextMenuRadioItem>
                ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {/* Relations */}
      {onAddRelation && (fieldPermissions?.parent ?? true) && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-3 w-full">
            <IconLink className="size-3.5" /> Add relation
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            {relationTypeOptions.map((relType) => {
              const [search, setSearch] = relationSearchState[
                relType.value
              ] || ["", () => {}];
              return (
                <ContextMenuSub key={relType.id}>
                  <ContextMenuSubTrigger className="gap-3 w-full">
                    {relType.icon} {relType.label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64 max-h-60 overflow-y-auto pt-0">
                    <div className="sticky top-0 bg-card z-999999999 w-full mb-1">
                      <Input
                        variant={"ghost"}
                        className="w-full p-3 border-b rounded-none"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    {relationTargetOptions
                      .filter(
                        (opt) =>
                          search === "" ||
                          opt.label
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          (opt.keywords || "").includes(search),
                      )
                      .slice(0, 20)
                      .map((opt) => (
                        <ContextMenuItem
                          key={opt.id}
                          className="gap-2"
                          onSelect={() =>
                            onAddRelation(task.id, opt.id, relType.value)
                          }
                        >
                          <div className="flex items-center gap-2 truncate">
                            {opt.icon}
                            <span className="truncate">{opt.label}</span>
                          </div>
                        </ContextMenuItem>
                      ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              );
            })}
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

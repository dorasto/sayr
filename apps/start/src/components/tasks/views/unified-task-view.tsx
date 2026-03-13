"use client";

import type { schema, TeamPermissions } from "@repo/database";
import {
  GridBoardCells,
  GridBoardColumnHeader,
  GridBoardColumns,
  type GridBoardColumnData,
  type GridBoardDragEndEvent,
  GridBoardItem,
  GridBoardProvider,
  GridBoardRowHeader,
  GridBoardRows,
  type GridBoardRowData,
} from "@repo/ui/components/doras-ui/grid-board";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import { updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { FieldUpdatePayload } from "../actions/types";
import {
  getStatusUpdatePayload,
  getPriorityUpdatePayload,
  getAssigneeBulkUpdatePayload,
  getLabelBulkUpdatePayload,
  getCategoryUpdatePayload,
  getReleaseUpdatePayload,
  getParentUpdatePayload,
  getRelationUpdatePayload,
} from "../actions";
import type { WSMessage } from "@/lib/ws";
import { applyFilters } from "../filter/filter-config";
import type { TaskGroup } from "../filter/types";
import {
  applyNestedGrouping,
  type NestedTaskGroup,
} from "../shared/nested-grouping";
import { TaskGroupSectionHeader } from "../task/task-group-section-header";
import { UnifiedTaskItem } from "./unified-task-item";
import { getTaskFieldPermissions, type FieldPermissions } from "../shared/task-field-toolbar-types";
import { BulkActionBar, type BulkUpdateAddRemove } from "./bulk-action-bar";
import Loader from "@/components/Loader";
import { userPreferencesStore } from "@/lib/stores/user-preferences-store";
import { TaskDetailDialog } from "../task/task-detail-dialog";

interface UnifiedTaskViewProps {
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  ws: WebSocket | null;
  availableUsers: schema.userType[];
  availableLabels?: schema.labelType[];
  organization?: schema.OrganizationWithMembers;
  categories: schema.categoryType[];
  releases?: schema.releaseType[];
  compact?: boolean;
  forceShowCompleted?: boolean;
  /** When true, shows org badges on each task row (cross-org mode) */
  personal?: boolean;
  /** Optional views to pass when no org context is available */
  views?: schema.savedViewType[];
  /** Optional className override for the outermost wrapper div */
  className?: string;
  /** Called when the dialog opens/closes a task, so the parent can switch WS channels */
  onActiveDialogTaskChange?: (taskId: string | null) => void;
  /** Per-org permissions map for cross-org views (e.g. /mine). When provided with accountId, enables field-level gating. */
  permissionsByOrg?: Record<string, TeamPermissions>;
  /** The current user's ID. Required alongside permissionsByOrg for field-level gating. */
  accountId?: string;
}

export function UnifiedTaskView({
  tasks,
  setTasks,
  ws,
  availableUsers = [],
  availableLabels = [],
  organization,
  categories,
  releases = [],
  compact = false,
  forceShowCompleted = false,
  personal = false,
  views: viewsProp,
  className: classNameProp,
  onActiveDialogTaskChange,
  permissionsByOrg,
  accountId,
}: UnifiedTaskViewProps) {
  // console.log("[RENDER] UnifiedTaskView");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Shared State
  // Consolidated task view state management - pass views to enable auto-loading
  const { filters, grouping, subGrouping, showCompletedTasks, viewMode } =
    useTaskViewManager(viewsProp);

  // Override showCompletedTasks if forceShowCompleted is true
  const effectiveShowCompleted = forceShowCompleted || showCompletedTasks;

  const { runWithToast } = useToastAction();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

  // Task open mode preference
  const taskOpenMode = useStore(userPreferencesStore, (s) => s.taskOpenMode);
  const [dialogTask, setDialogTask] = useState<schema.TaskWithLabels | null>(null);

  const handleTaskClick = useCallback(
    (task: schema.TaskWithLabels) => {
      setDialogTask(task);
    },
    [],
  );

  const handleOpenInDialog = useCallback(
    (task: schema.TaskWithLabels) => {
      setDialogTask(task);
    },
    [],
  );

  // Notify parent when the active dialog task changes (for WS channel switching)
  useEffect(() => {
    onActiveDialogTaskChange?.(dialogTask?.id ?? null);
  }, [dialogTask?.id, onActiveDialogTaskChange]);

  // Keep dialogTask in sync with the tasks array (real-time updates)
  useEffect(() => {
    if (dialogTask) {
      const updated = tasks.find((t) => t.id === dialogTask.id);
      if (updated && updated !== dialogTask) {
        setDialogTask(updated);
      }
    }
  }, [tasks, dialogTask]);

  // List View Specific State
  // Apply filters to tasks (used by both grouping and selection)
  const filteredTasks = useMemo(() => {
    return applyFilters(tasks, filters);
  }, [tasks, filters]);

  const filteredTaskIds = useMemo(() => {
    return filteredTasks.map((t) => t.id);
  }, [filteredTasks]);

  const {
    selectedSet: selectedTasks,
    selectedCount,
    toggleTask,
    selectAll,
    deselectAll,
    isAllSelected,
    isIndeterminate,
  } = useTaskSelection(filteredTaskIds);

  // Resolve selected task objects for the bulk action bar
  const selectedTaskData = useMemo(() => {
    return tasks.filter((t) => selectedTasks.has(t.id));
  }, [tasks, selectedTasks]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  // Reset collapsed sections when grouping changes
  useEffect(() => {
    setCollapsedSections(new Set());
    void grouping;
  }, [grouping]);

  // WebSocket Handlers
  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_TASK: (msg) => {
      const updatedTask = msg.data;
      const updatedTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      setTasks(updatedTasks);
    },
  };

  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    // onUnhandled: (msg) =>
    //   console.warn("⚠️ [UNHANDLED MESSAGE UnifiedTaskView]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  // Handlers
  const handleTaskSelect = useCallback(
    (taskId: string, selected: boolean) => {
      toggleTask(taskId, selected);
    },
    [toggleTask],
  );

  // Clear selection on unmount
  useEffect(() => {
    return () => {
      deselectAll();
    };
  }, [deselectAll]);

  const handleToggleSection = (groupId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedSections(newCollapsed);
  };

  // Lightweight dispatcher for FieldUpdatePayload — mirrors useTaskFieldAction.execute
  // but operates on any task by ID rather than being bound to a single task instance.
  const dispatchPayload = async (payload: FieldUpdatePayload) => {
    switch (payload.kind) {
      case "single": {
        const orgId = payload.optimisticTask.organizationId;
        await runWithToast(
          `update-task-${payload.field}`,
          payload.toastMessages,
          () => updateTaskAction(orgId, payload.optimisticTask.id, payload.updateData, wsClientId),
        );
        break;
      }
      case "multi":
      case "parent": {
        await runWithToast(payload.actionId, payload.toastMessages, payload.apiFn);
        break;
      }
      case "relation": {
        await runWithToast(payload.actionId, payload.toastMessages, payload.apiFn);
        break;
      }
    }
  };

  const handleTaskUpdate = async (
    taskId: string,
    updates: Partial<schema.TaskWithLabels>,
  ) => {
    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t,
    );
    setTasks(updatedTasks);

    // Look up the task to pass to payload generators
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (updates.status) {
      await dispatchPayload(getStatusUpdatePayload(task, updates.status));
    }
    if (updates.priority) {
      await dispatchPayload(getPriorityUpdatePayload(task, updates.priority));
    }
    if (updates.assignees) {
      await dispatchPayload(
        getAssigneeBulkUpdatePayload(task, updates.assignees.map((u) => u.id), availableUsers, wsClientId),
      );
    }
    if (updates.labels) {
      await dispatchPayload(
        getLabelBulkUpdatePayload(task, updates.labels.map((l) => l.id), availableLabels, wsClientId),
      );
    }
    if (updates.category !== undefined) {
      await dispatchPayload(getCategoryUpdatePayload(task, updates.category, categories));
    }
    if (updates.releaseId !== undefined) {
      await dispatchPayload(getReleaseUpdatePayload(task, updates.releaseId, releases));
    }
    if (updates.parentId !== undefined) {
      await dispatchPayload(getParentUpdatePayload(task, updates.parentId, tasks, wsClientId));
    }
  };

  const handleAddRelation = async (
    sourceTaskId: string,
    targetTaskId: string,
    type: "related" | "blocking" | "duplicate",
  ) => {
    const task = tasks.find((t) => t.id === sourceTaskId);
    if (!task) return;
    await dispatchPayload(getRelationUpdatePayload(task, targetTaskId, type, tasks, wsClientId));
  };

  // Bulk update handler - iterates over selected tasks in parallel
  const handleBulkUpdate = async (field: string, value: unknown) => {
    const selectedIds = Array.from(selectedTasks);
    if (selectedIds.length === 0) return;

    // Build updates based on field
    const getUpdatesForTask = (
      taskId: string,
    ): Partial<schema.TaskWithLabels> => {
      const task = tasks.find((t) => t.id === taskId);
      switch (field) {
        case "status":
          return { status: value as schema.TaskWithLabels["status"] };
        case "priority":
          return { priority: value as schema.TaskWithLabels["priority"] };
        case "assignees": {
          const { add, remove } = value as BulkUpdateAddRemove;
          const existing = task?.assignees ?? [];
          const existingIds = new Set(existing.map((a) => a.id));
          // Add new assignees, remove unwanted ones
          const finalIds = new Set(existingIds);
          for (const id of add) finalIds.add(id);
          for (const id of remove) finalIds.delete(id);
          const users = availableUsers.filter((u) => finalIds.has(u.id));
          return { assignees: users };
        }
        case "labels": {
          const { add, remove } = value as BulkUpdateAddRemove;
          const existing = task?.labels ?? [];
          const existingIds = new Set(existing.map((l) => l.id));
          // Add new labels, remove unwanted ones
          const finalIds = new Set(existingIds);
          for (const id of add) finalIds.add(id);
          for (const id of remove) finalIds.delete(id);
          const labels = availableLabels.filter((l) => finalIds.has(l.id));
          return { labels };
        }
        case "category":
          return { category: value as string };
        case "release":
          return { releaseId: value as string };
        default:
          return {};
      }
    };

    // Optimistic update for all selected tasks
    const updatedTasks = tasks.map((t) => {
      if (!selectedTasks.has(t.id)) return t;
      return { ...t, ...getUpdatesForTask(t.id) };
    });
    setTasks(updatedTasks);

    // Fire API calls in parallel
    const results = await Promise.allSettled(
      selectedIds.map((taskId) =>
        handleTaskUpdate(taskId, getUpdatesForTask(taskId)),
      ),
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error(`Failed to update ${failures.length} task(s)`, failures);
    }

    // Clear selection after bulk action
    deselectAll();
  };

  // Grouping Logic with nested sub-grouping support
  const groupedTasks = useMemo((): NestedTaskGroup[] => {
    return applyNestedGrouping(grouping, subGrouping, {
      tasks: filteredTasks,
      availableUsers,
      showCompletedTasks: effectiveShowCompleted,
      categories,
      releases,
    });
  }, [
    filteredTasks,
    availableUsers,
    effectiveShowCompleted,
    grouping,
    subGrouping,
    categories,
    releases,
  ]);

  // Check if we have sub-groups for kanban view
  const hasKanbanSubGroups =
    groupedTasks.length > 0 &&
    groupedTasks[0]?.subGroups &&
    groupedTasks[0].subGroups.length > 0;

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderLoading = () => <Loader />;

  const renderTaskItem = (
    task: schema.TaskWithLabels,
    groupId: string,
    mode: "list" | "kanban",
    columnId?: string,
  ) => {
    // Compute field permissions when cross-org permission data is available
    const fieldPerms: FieldPermissions | undefined =
      permissionsByOrg && accountId
        ? getTaskFieldPermissions(task, accountId, permissionsByOrg[task.organizationId])
        : undefined;

    return (
    <UnifiedTaskItem
      key={`${groupId}:${task.id}`}
      viewMode={mode}
      task={task}
      columnId={columnId}
      isSelected={mode === "list" ? selectedTasks.has(task.id) : undefined}
      onSelect={
        mode === "list"
          ? (selected) => handleTaskSelect(task.id, selected)
          : undefined
      }
      tasks={tasks}
      setTasks={setTasks}
      availableUsers={availableUsers}
      availableLabels={availableLabels}
      onTaskUpdate={handleTaskUpdate}
      onTaskClick={taskOpenMode === "dialog" ? handleTaskClick : undefined}
      onOpenInDialog={handleOpenInDialog}
      onAddRelation={handleAddRelation}
      categories={categories}
      releases={releases}
      compact={compact}
      personal={personal}
      fieldPermissions={fieldPerms}
    />
    );
  };

  const renderEmptyGroup = () => (
    <div className="px-4 py-3 text-xs text-muted-foreground">
      No tasks in this group
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex items-center justify-center">No issues found</div>
  );

  const renderKanbanView = () => {
    // Transform groupedTasks into GridBoard columns
    const gridColumns: GridBoardColumnData[] = groupedTasks.map((group) => ({
      id: group.id,
      label: group.label,
      count: group.count,
      icon: group.icon,
      accentClassName: group.accentClassName,
    }));

    // Transform subGroups into GridBoard rows (if they exist)
    const gridRows: GridBoardRowData[] | undefined = hasKanbanSubGroups
      ? groupedTasks[0]?.subGroups?.map((sg) => ({
          id: sg.id,
          label: sg.label,
          icon: sg.icon,
          accentClassName: sg.accentClassName,
        }))
      : undefined;

    // Build a flat list of items with columnId and rowId for GridBoard
    type GridItem = schema.TaskWithLabels & {
      columnId: string;
      rowId?: string;
    };
    const gridItems: GridItem[] = [];

    for (const group of groupedTasks) {
      if (hasKanbanSubGroups && group.subGroups) {
        for (const subGroup of group.subGroups) {
          for (const task of subGroup.tasks) {
            gridItems.push({ ...task, columnId: group.id, rowId: subGroup.id });
          }
        }
      } else {
        for (const task of group.tasks) {
          gridItems.push({ ...task, columnId: group.id });
        }
      }
    }

    // Custom getItemsForCell to look up tasks by column/row
    const getItemsForCell = (columnId: string, rowId?: string): GridItem[] => {
      const group = groupedTasks.find((g) => g.id === columnId);
      if (!group) return [];

      if (rowId !== undefined && group.subGroups) {
        const subGroup = group.subGroups.find((sg) => sg.id === rowId);
        return (subGroup?.tasks || []).map((t) => ({ ...t, columnId, rowId }));
      }
      return group.tasks.map((t) => ({ ...t, columnId }));
    };

    // Calculate row totals for row headers
    const getRowTotal = (rowId: string): number => {
      return gridColumns.reduce(
        (sum, col) => sum + getItemsForCell(col.id, rowId).length,
        0,
      );
    };

    // Handle drag end - update both column (primary grouping) and row (sub-grouping)
    const handleGridDragEnd = async (
      event: GridBoardDragEndEvent<GridItem>,
    ) => {
      const { item, toColumnId, toRowId } = event;
      const itemId = item.id;

      // Helper to update local state optimistically
      const updateLocal = (updates: Partial<schema.TaskWithLabels>) => {
        const updatedTasks = tasks.map((t) =>
          t.id === itemId ? { ...t, ...updates } : t,
        );
        setTasks(updatedTasks);
      };

      // Helper to extract the actual value from prefixed IDs like "status:backlog" -> "backlog"
      const extractValue = (id: string, prefix: string): string | null => {
        if (id.startsWith(`${prefix}:`)) {
          return id.slice(prefix.length + 1);
        }
        return null;
      };

      // Determine what fields to update based on grouping/subGrouping
      const updates: Partial<schema.TaskWithLabels> = {};

      // Handle column change (primary grouping)
      if (grouping === "status") {
        const status = extractValue(toColumnId, "status");
        if (status) {
          updates.status = status as schema.TaskWithLabels["status"];
        }
      } else if (grouping === "priority") {
        const priority = extractValue(toColumnId, "priority");
        if (priority) {
          updates.priority = priority as schema.TaskWithLabels["priority"];
        }
      } else if (grouping === "assignee") {
        const assigneeId = extractValue(toColumnId, "assignee");
        if (assigneeId === "unassigned") {
          updates.assignees = [];
        } else if (assigneeId) {
          const user = availableUsers.find((u) => u.id === assigneeId);
          if (user) updates.assignees = [user];
        }
      } else if (grouping === "category") {
        const categoryId = extractValue(toColumnId, "category");
        if (categoryId === "none") {
          updates.category = null;
        } else if (categoryId) {
          updates.category = categoryId;
        }
      }

      // Handle row change (sub-grouping)
      if (toRowId !== undefined) {
        if (subGrouping === "status") {
          const status = extractValue(toRowId, "status");
          if (status) {
            updates.status = status as schema.TaskWithLabels["status"];
          }
        } else if (subGrouping === "priority") {
          const priority = extractValue(toRowId, "priority");
          if (priority) {
            updates.priority = priority as schema.TaskWithLabels["priority"];
          }
        } else if (subGrouping === "assignee") {
          const assigneeId = extractValue(toRowId, "assignee");
          if (assigneeId === "unassigned") {
            updates.assignees = [];
          } else if (assigneeId) {
            const user = availableUsers.find((u) => u.id === assigneeId);
            if (user) updates.assignees = [user];
          }
        } else if (subGrouping === "category") {
          const categoryId = extractValue(toRowId, "category");
          if (categoryId === "none") {
            updates.category = null;
          } else if (categoryId) {
            updates.category = categoryId;
          }
        }
      }

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        // console.log("[GridBoard] No updates to apply", {
        //   toColumnId,
        //   toRowId,
        //   grouping,
        //   subGrouping,
        // });
        return;
      }

      // console.log("[GridBoard] Applying updates", {
      //   itemId,
      //   updates,
      //   toColumnId,
      //   toRowId,
      // });

      // Apply optimistic update
      updateLocal(updates);

      // Look up the task to pass to payload generators
      const task = tasks.find((t) => t.id === itemId);
      if (!task) return;

      // Send updates to server via action system
      if (updates.status) {
        await dispatchPayload(getStatusUpdatePayload(task, updates.status));
      }

      if (updates.priority) {
        await dispatchPayload(getPriorityUpdatePayload(task, updates.priority));
      }

      if (updates.assignees !== undefined) {
        await dispatchPayload(
          getAssigneeBulkUpdatePayload(task, updates.assignees.map((u) => u.id), availableUsers, wsClientId),
        );
      }

      if (updates.category !== undefined) {
        await dispatchPayload(getCategoryUpdatePayload(task, updates.category, categories));
      }
    };

    // Render drag overlay
    const renderDragOverlay = (item: GridItem) => {
      const dragFieldPerms: FieldPermissions | undefined =
        permissionsByOrg && accountId
          ? getTaskFieldPermissions(item, accountId, permissionsByOrg[item.organizationId])
          : undefined;

      return (
      <div className="opacity-90 rotate-2 scale-105">
        <UnifiedTaskItem
          viewMode="kanban"
          task={item}
          columnId={item.columnId}
          tasks={tasks}
          setTasks={setTasks}
          availableUsers={availableUsers}
          availableLabels={availableLabels}
          onTaskUpdate={handleTaskUpdate}
          onAddRelation={handleAddRelation}
          categories={categories}
          releases={releases}
          compact={compact}
          personal={personal}
          fieldPermissions={dragFieldPerms}
        />
      </div>
      );
    };

    return (
      <GridBoardProvider
        columns={gridColumns}
        rows={gridRows}
        items={gridItems}
        getItemsForCell={getItemsForCell}
        onDragEnd={handleGridDragEnd}
        renderDragOverlay={renderDragOverlay}
        mode={hasKanbanSubGroups ? "grid" : "kanban"}
      >
        {/* Column Headers */}
        <GridBoardColumns>
          {(column) => (
            <GridBoardColumnHeader key={column.id} column={column} />
          )}
        </GridBoardColumns>

        {/* Rows with cells (if sub-groups exist) */}
        {hasKanbanSubGroups && gridRows ? (
          <GridBoardRows>
            {(row) => (
              <div key={row.id}>
                <GridBoardRowHeader row={row} count={getRowTotal(row.id)} />
                <GridBoardCells rowId={row.id}>
                  {(item: GridItem, column) => (
                    <GridBoardItem key={item.id} item={item}>
                      {renderTaskItem(item, column.id, "kanban", column.id)}
                    </GridBoardItem>
                  )}
                </GridBoardCells>
              </div>
            )}
          </GridBoardRows>
        ) : (
          /* No sub-groups: render cells directly (kanban mode) */
          <GridBoardCells>
            {(item: GridItem, column) => (
              <GridBoardItem key={item.id} item={item}>
                {renderTaskItem(item, column.id, "kanban", column.id)}
              </GridBoardItem>
            )}
          </GridBoardCells>
        )}
      </GridBoardProvider>
    );
  };

  const renderListSubGroup = (group: NestedTaskGroup, subGroup: TaskGroup) => {
    const subGroupCollapsed = collapsedSections.has(subGroup.id);

    return (
      <div key={subGroup.id}>
        <TaskGroupSectionHeader
          group={subGroup}
          isCollapsed={subGroupCollapsed}
          onToggleCollapse={() => handleToggleSection(subGroup.id)}
          isSubGroup={true}
          className="py-1"
          rootClassName="bg-muted/0 hover:bg-muted/20 transition-all"
          compact={compact}
        />
        {!subGroupCollapsed && (
          <div className="py-1 flex flex-col gap-1">
            {subGroup.tasks.length > 0
              ? subGroup.tasks.map((task) =>
                  renderTaskItem(task, group.id, "list"),
                )
              : renderEmptyGroup()}
          </div>
        )}
      </div>
    );
  };

  const renderListGroup = (group: NestedTaskGroup) => {
    const isCollapsed = collapsedSections.has(group.id);
    const hasSubGroups = group.subGroups && group.subGroups.length > 0;

    const renderGroupContent = () => {
      if (hasSubGroups && group.subGroups) {
        return group.subGroups.map((subGroup) =>
          renderListSubGroup(group, subGroup),
        );
      }
      if (group.tasks.length > 0) {
        return group.tasks.map((task) =>
          renderTaskItem(task, group.id, "list"),
        );
      }
      return renderEmptyGroup();
    };

    return (
      <div key={group.id}>
        <TaskGroupSectionHeader
          group={group}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => handleToggleSection(group.id)}
          isSticky={true}
          compact={compact}
        />
        {!isCollapsed && (
          <div className="flex flex-col gap-0">{renderGroupContent()}</div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    if (groupedTasks.length === 0) {
      return renderEmptyState();
    }
    return (
      <div className={cn("rounded h-full", compact && "px-0")}>
        {groupedTasks.map(renderListGroup)}
      </div>
    );
  };

  const renderMainContent = () => {
    if (viewMode === "kanban") {
      // Always use GridBoard for kanban - mode is set based on hasKanbanSubGroups
      return renderKanbanView();
    }
    return renderListView();
  };

  // ============================================================================
  // Main Return
  // ============================================================================

  if (!mounted) {
    return renderLoading();
  }
  const smallViewport = window.innerWidth < 1000;
  return (
    <div className={cn("h-full overflow-auto rounded", classNameProp)}>
      {renderMainContent()}
      {!compact && (
        <BulkActionBar
          selectedCount={selectedCount}
          selectedTasks={selectedTaskData}
          visible={selectedCount > 0 && viewMode === "list"}
          onDeselectAll={deselectAll}
          onSelectAll={() => selectAll(filteredTaskIds)}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onBulkUpdate={handleBulkUpdate}
          availableUsers={availableUsers}
          availableLabels={availableLabels}
          categories={categories}
          releases={releases}
          compact={smallViewport}
        />
      )}
      <TaskDetailDialog
        task={dialogTask}
        open={dialogTask !== null}
        onOpenChange={(open) => {
          if (!open) setDialogTask(null);
        }}
        tasks={tasks}
        setTasks={setTasks}
        labels={availableLabels}
        categories={categories}
        releases={releases}
        organization={organization}
        fieldPermissions={
          dialogTask && permissionsByOrg && accountId
            ? getTaskFieldPermissions(dialogTask, accountId, permissionsByOrg[dialogTask.organizationId])
            : undefined
        }
      />
    </div>
  );
}

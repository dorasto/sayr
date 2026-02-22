"use client";

import type { schema } from "@repo/database";
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
import { useEffect, useMemo, useState } from "react";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  updateAssigneesToTaskAction,
  updateLabelToTaskAction,
  updateTaskAction,
} from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { WSMessage } from "@/lib/ws";
import { applyFilters } from "../filter/filter-config";
import type { TaskGroup } from "../filter/types";
import {
  applyNestedGrouping,
  type NestedTaskGroup,
} from "../shared/nested-grouping";
import { TaskGroupSectionHeader } from "../task/task-group-section-header";
import { UnifiedTaskItem } from "./unified-task-item";
import Loader from "@/components/Loader";

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

  // List View Specific State
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  // Reset collapsed sections when grouping changes
  useEffect(() => {
    setCollapsedSections(new Set());
    void grouping;
  }, [grouping]);

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return applyFilters(tasks, filters);
  }, [tasks, filters]);

  // WebSocket Handlers
  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_TASK: (msg) => {
      const updatedTask = msg.data;
      const updatedTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      setTasks(updatedTasks);
    },
    UPDATE_TASK_COMMENTS: async (_msg) => {},
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
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleToggleSection = (groupId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(groupId)) {
      newCollapsed.delete(groupId);
    } else {
      newCollapsed.add(groupId);
    }
    setCollapsedSections(newCollapsed);
  };

  // Resolve orgId: use organization prop when available, otherwise fall back to per-task organizationId (cross-org mode)
  const getOrgId = (taskId: string): string => {
    if (organization) return organization.id;
    const task = tasks.find((t) => t.id === taskId);
    return task?.organizationId ?? "";
  };

  const handleTaskUpdate = async (
    taskId: string,
    updates: Partial<schema.TaskWithLabels>,
  ) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t,
    );
    setTasks(updatedTasks);

    const orgId = getOrgId(taskId);

    if (updates.status) {
      await runWithToast(
        "update-status",
        {
          loading: { title: "Updating status..." },
          success: { title: "Status updated" },
          error: { title: "Failed to update status" },
        },
        () =>
          updateTaskAction(
            orgId,
            taskId,
            { status: updates.status },
            wsClientId,
          ),
      );
    }
    if (updates.priority) {
      await runWithToast(
        "update-priority",
        {
          loading: { title: "Updating priority..." },
          success: { title: "Priority updated" },
          error: { title: "Failed to update priority" },
        },
        () =>
          updateTaskAction(
            orgId,
            taskId,
            { priority: updates.priority },
            wsClientId,
          ),
      );
    }
    if (updates.assignees) {
      await runWithToast(
        "update-assignees",
        {
          loading: { title: "Updating assignees..." },
          success: { title: "Assignees updated" },
          error: { title: "Failed to update assignees" },
        },
        () =>
          updateAssigneesToTaskAction(
            orgId,
            taskId,
            updates.assignees?.map((u) => u.id) || [],
            wsClientId,
          ),
      );
    }
    if (updates.labels) {
      await runWithToast(
        "update-labels",
        {
          loading: { title: "Updating labels..." },
          success: { title: "Labels updated" },
          error: { title: "Failed to update labels" },
        },
        () =>
          updateLabelToTaskAction(
            orgId,
            taskId,
            updates.labels?.map((l) => l.id) || [],
            wsClientId,
          ),
      );
    }
    if (updates.category !== undefined) {
      await runWithToast(
        "update-category",
        {
          loading: { title: "Updating category..." },
          success: { title: "Category updated" },
          error: { title: "Failed to update category" },
        },
        () =>
          updateTaskAction(
            orgId,
            taskId,
            { category: updates.category },
            wsClientId,
          ),
      );
    }
    if (updates.releaseId !== undefined) {
      await runWithToast(
        "update-release",
        {
          loading: { title: "Updating release..." },
          success: { title: "Release updated" },
          error: { title: "Failed to update release" },
        },
        () =>
          updateTaskAction(
            orgId,
            taskId,
            { releaseId: updates.releaseId },
            wsClientId,
          ),
      );
    }
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
  ) => (
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
      categories={categories}
      releases={releases}
      compact={compact}
      personal={personal}
    />
  );

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

      const orgId = getOrgId(itemId);

      // Send updates to server
      if (updates.status) {
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating status..." },
            success: { title: "Status updated" },
            error: { title: "Failed to update status" },
          },
          () =>
            updateTaskAction(
              orgId,
              itemId,
              { status: updates.status },
              wsClientId,
            ),
        );
      }

      if (updates.priority) {
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating priority..." },
            success: { title: "Priority updated" },
            error: { title: "Failed to update priority" },
          },
          () =>
            updateTaskAction(
              orgId,
              itemId,
              { priority: updates.priority },
              wsClientId,
            ),
        );
      }

      if (updates.assignees !== undefined) {
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating assignee..." },
            success: { title: "Assignee updated" },
            error: { title: "Failed to update assignee" },
          },
          () =>
            updateAssigneesToTaskAction(
              orgId,
              itemId,
              updates.assignees?.map((u) => u.id) || [],
              wsClientId,
            ),
        );
      }

      if (updates.category !== undefined) {
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating category..." },
            success: { title: "Category updated" },
            error: { title: "Failed to update category" },
          },
          () =>
            updateTaskAction(
              orgId,
              itemId,
              { category: updates.category },
              wsClientId,
            ),
        );
      }
    };

    // Render drag overlay
    const renderDragOverlay = (item: GridItem) => (
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
          categories={categories}
          releases={releases}
          compact={compact}
          personal={personal}
        />
      </div>
    );

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

  return (
    <div className="h-full overflow-auto rounded">
      {renderMainContent()}
    </div>
  );
}

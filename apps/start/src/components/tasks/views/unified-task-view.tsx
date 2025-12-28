"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import {
  KanbanBoard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from "@repo/ui/components/kibo-ui/kanban/index";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import {
  useWSMessageHandler,
  type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import {
  updateAssigneesToTaskAction,
  updateTaskAction,
} from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { WSMessage } from "@/lib/ws";
import { applyFilters } from "../filter/filter-config";
import type { FilterState } from "../filter/types";
import { useTaskViewState } from "../filter/use-task-view-state";
import { TASK_GROUPINGS } from "../shared/config";
import { TaskContent } from "../task/task-content";
import { TaskGroupSectionHeader } from "../task/task-group-section-header";
import { UnifiedTaskItem } from "./unified-task-item";

interface UnifiedTaskViewProps {
  tasks: schema.TaskWithLabels[];
  setTasks: (newValue: schema.TaskWithLabels[]) => void;
  ws: WebSocket | null;
  labels: schema.labelType[];
  availableUsers: schema.userType[];
  organization: schema.OrganizationWithMembers;
  categories: schema.categoryType[];
}

export function UnifiedTaskView({
  tasks,
  setTasks,
  ws,
  labels,
  availableUsers = [],
  organization,
  categories,
}: UnifiedTaskViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Shared State
  const { value: selectedTask, setValue: setSelectedTask } =
    useStateManagement<schema.TaskWithLabels | null>("task", null, 3000);
  const { value: filterState } = useStateManagement<FilterState>(
    "task-filters",
    { groups: [], operator: "AND" },
    1,
  );
  const [taskContentOpen, setTaskContentOpen] = useQueryState(
    "task",
    parseAsInteger.withDefault(0),
  );
  const { viewState } = useTaskViewState();
  const { grouping, showEmptyGroups, showCompletedTasks, viewMode } = viewState;
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
    return applyFilters(tasks, filterState);
  }, [tasks, filterState]);

  // Sync selected task with query param
  useEffect(() => {
    if (taskContentOpen === 0) {
      setSelectedTask(null);
    }
    const task = filteredTasks.find((t) => t.shortId === taskContentOpen);
    if (task) {
      setSelectedTask(task);
      setTaskContentOpen(task.shortId);
    }
  }, [taskContentOpen, setSelectedTask, filteredTasks, setTaskContentOpen]);

  // WebSocket Handlers
  const handlers: WSMessageHandler<WSMessage> = {
    UPDATE_TASK: (msg) => {
      const updatedTask = msg.data;
      const updatedTasks = tasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      setTasks(updatedTasks);
      if (selectedTask && selectedTask.id === updatedTask.id) {
        setSelectedTask({ ...selectedTask, ...updatedTask });
        sendWindowMessage(
          window,
          {
            type: "timeline-update",
            payload: updatedTask.id,
          },
          "*",
        );
      }
    },
    UPDATE_TASK_COMMENTS: async (msg) => {
      if (selectedTask && selectedTask.id === msg.data.id) {
        sendWindowMessage(
          window,
          {
            type: "timeline-update-comment",
            payload: msg.data.id,
          },
          "*",
        );
      }
    },
  };

  const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
    onUnhandled: (msg) =>
      console.warn("⚠️ [UNHANDLED MESSAGE UnifiedTaskView]", msg),
  });

  useEffect(() => {
    if (!ws) return;
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, handleMessage]);

  // Handlers
  const handleTaskClick = (taskId: string) => {
    const task = filteredTasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setTaskContentOpen(task.shortId);
    }
  };

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

  const handleTaskUpdate = async (
    taskId: string,
    updates: Partial<schema.TaskWithLabels>,
  ) => {
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t,
    );
    setTasks(updatedTasks);

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
            organization.id,
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
            organization.id,
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
            organization.id,
            taskId,
            updates.assignees?.map((u) => u.id) || [],
            wsClientId,
          ),
      );
    }
  };

  // Grouping Logic
  const groupingDefinition = useMemo(() => {
    return TASK_GROUPINGS[grouping] ?? TASK_GROUPINGS.status;
  }, [grouping]);

  const groupedTasks = useMemo(() => {
    return groupingDefinition.group({
      tasks: filteredTasks,
      availableUsers,
      showEmptyGroups,
      showCompletedTasks,
      categories,
    });
  }, [
    filteredTasks,
    availableUsers,
    showEmptyGroups,
    showCompletedTasks,
    groupingDefinition,
    categories,
  ]);

  // Kanban Specific Data Preparation
  const columns = useMemo(
    () => groupedTasks.map((g) => ({ ...g, name: g.label })),
    [groupedTasks],
  );

  const kanbanData = useMemo(() => {
    return groupedTasks.flatMap((g) =>
      g.tasks.map((t) => ({ ...t, column: g.id, name: t.title || "Untitled" })),
    );
  }, [groupedTasks]);

  const handleKanbanDataChange = async (newData: typeof kanbanData) => {
    const changedItem = newData.find((newItem) => {
      const oldItem = kanbanData.find((old) => old.id === newItem.id);
      return oldItem && oldItem.column !== newItem.column;
    });

    if (changedItem) {
      const newColumnId = changedItem.column;
      const taskId = changedItem.id;

      const updateLocal = (updates: Partial<schema.TaskWithLabels>) => {
        const updatedTasks = tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t,
        );
        setTasks(updatedTasks);
      };

      if (grouping === "status") {
        // biome-ignore lint/suspicious/noExplicitAny: Casting to any for status update
        const status = newColumnId as any;
        updateLocal({ status });
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating status..." },
            success: { title: "Status updated" },
            error: { title: "Failed to update status" },
          },
          () =>
            updateTaskAction(organization.id, taskId, { status }, wsClientId),
        );
      } else if (grouping === "priority") {
        // biome-ignore lint/suspicious/noExplicitAny: Casting to any for priority update
        const priority = newColumnId as any;
        updateLocal({ priority });
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating priority..." },
            success: { title: "Priority updated" },
            error: { title: "Failed to update priority" },
          },
          () =>
            updateTaskAction(organization.id, taskId, { priority }, wsClientId),
        );
      } else if (grouping === "assignee") {
        let newAssignees: schema.userType[] = [];
        if (newColumnId !== "unassigned") {
          const user = availableUsers.find((u) => u.id === newColumnId);
          if (user) newAssignees = [user];
        }
        updateLocal({ assignees: newAssignees });
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating assignee..." },
            success: { title: "Assignee updated" },
            error: { title: "Failed to update assignee" },
          },
          () =>
            updateAssigneesToTaskAction(
              organization.id,
              taskId,
              newAssignees.map((u) => u.id),
              wsClientId,
            ),
        );
      } else if (grouping === "category") {
        const categoryId = newColumnId === "uncategorized" ? null : newColumnId;
        updateLocal({ category: categoryId });
        await runWithToast(
          "update-task",
          {
            loading: { title: "Updating category..." },
            success: { title: "Category updated" },
            error: { title: "Failed to update category" },
          },
          () =>
            updateTaskAction(
              organization.id,
              taskId,
              { category: categoryId },
              wsClientId,
            ),
        );
      }
    }
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-background">
        <div className="relative flex items-center justify-center">
          <IconLoader2 className="w-12 h-12 text-primary animate-spin" />
          <IconLoader2 className="absolute w-6 h-6 text-primary/50 animate-spin direction-reverse" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full overflow-x-auto rounded">
      {viewMode === "kanban" ? (
        <KanbanProvider
          columns={columns}
          data={kanbanData}
          onDataChange={handleKanbanDataChange}
        >
          {(column) => (
            <KanbanBoard
              key={column.id}
              id={column.id}
              className="bg-card border-0 rounded-lg shadow-none flex flex-col h-full w-full min-w-96 max-w-96 px-2"
            >
              <KanbanHeader className="pb-2 flex items-center justify-between bg-muted border-0 rounded-lg shrink-0 min-h-[42px]">
                <div className="flex items-center gap-2">
                  {column.icon && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        column.accentClassName,
                      )}
                    >
                      {column.icon}
                    </span>
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-sm">{column.name}</span>
                    {column.description && (
                      <span className="text-xs text-muted-foreground">
                        {column.description}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="rounded pointer-events-none border-transparent text-muted-foreground bg-background"
                >
                  {kanbanData.filter((t) => t.column === column.id).length}
                </Badge>
              </KanbanHeader>
              <KanbanCards
                id={column.id}
                className="gap-2 flex flex-col h-full overflow-y-auto px-0"
              >
                {(item) => (
                  <UnifiedTaskItem
                    key={item.id}
                    viewMode="kanban"
                    task={item as unknown as schema.TaskWithLabels}
                    columnId={column.id}
                    onTaskClick={handleTaskClick}
                    tasks={tasks}
                    setTasks={setTasks}
                    availableUsers={availableUsers}
                    onTaskUpdate={handleTaskUpdate}
                  />
                )}
              </KanbanCards>
            </KanbanBoard>
          )}
        </KanbanProvider>
      ) : (
        <div className="rounded h-full">
          {groupedTasks.length > 0 ? (
            groupedTasks.map((group) => {
              const isCollapsed = collapsedSections.has(group.id);

              return (
                <div key={group.id} className="">
                  <TaskGroupSectionHeader
                    group={group}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => handleToggleSection(group.id)}
                  />

                  {!isCollapsed && (
                    <div className="py-1 flex flex-col gap-1">
                      {group.tasks.length > 0 ? (
                        group.tasks.map((task) => (
                          <UnifiedTaskItem
                            viewMode="list"
                            key={`${group.id}:${task.id}`}
                            task={task}
                            isSelected={selectedTasks.has(task.id)}
                            onSelect={(selected) =>
                              handleTaskSelect(task.id, selected)
                            }
                            onTaskClick={handleTaskClick}
                            tasks={tasks}
                            setTasks={setTasks}
                            availableUsers={availableUsers}
                            onTaskUpdate={handleTaskUpdate}
                            categories={categories}
                          />
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-muted-foreground">
                          No tasks in this group
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center">
              No issues found
            </div>
          )}
        </div>
      )}

      {selectedTask && (
        <TaskContent
          task={selectedTask}
          open={typeof taskContentOpen === "number"}
          onOpenChange={(value) => {
            if (!value) {
              setTaskContentOpen(0);
              setSelectedTask(null);
            }
          }}
          labels={labels}
          tasks={tasks}
          setTasks={setTasks}
          setSelectedTask={setSelectedTask}
          availableUsers={availableUsers}
          organization={organization}
          ws={ws}
          categories={categories}
        />
      )}
    </div>
  );
}

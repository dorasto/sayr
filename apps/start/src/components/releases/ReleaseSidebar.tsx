"use client";

import {
  Tile,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import {
  TaskPriorityBar,
  TaskAssigneeChart,
  SimpleAreaChart,
  type AreaChartSeries,
} from "@/components/charts";
import {
  IconChartBar,
  IconUsers,
  IconCheckbox,
  IconTrendingUp,
} from "@tabler/icons-react";
import type { schema } from "@repo/database";
import { useMemo, useCallback, type ReactNode } from "react";
import { ReleaseStats } from "./ReleaseStats";
import { Link } from "@tanstack/react-router";
import { serializeFilters } from "@/components/tasks/filter/serialization";
import type { FilterState } from "@/components/tasks/filter/types";

interface ReleaseSidebarProps {
  tasks: schema.TaskWithLabels[];
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    backlog: number;
    completionPercentage: number;
  };
  daysUntilTarget: number | null;
  organizationId: string;
  releaseId: string;
}

export function ReleaseSidebar({
  tasks,
  taskStats,
  daysUntilTarget,
  organizationId,
  releaseId,
}: ReleaseSidebarProps) {
  // Render prop to wrap each assignee tile with a Link
  const renderTileWrapper = useCallback(
    (assigneeId: string, children: ReactNode) => {
      // Create filter state for this assignee + release
      const filterState: FilterState = {
        groups: [
          {
            id: "group-0",
            operator: "AND",
            conditions: [
              {
                id: "assignee-filter",
                field: "assignee",
                operator: assigneeId === "unassigned" ? "empty" : "any",
                value: assigneeId === "unassigned" ? null : [assigneeId],
              },
              {
                id: "release-filter",
                field: "release",
                operator: "any",
                value: [releaseId],
              },
            ],
          },
        ],
        operator: "AND",
      };

      // Serialize filters - this returns an already-encoded string
      const filtersParam = serializeFilters(filterState);

      return (
        <Link
          to="/$orgId/tasks"
          params={{ orgId: organizationId }}
          search={(prev) => ({ ...prev, filters: decodeURIComponent(filtersParam) })}
          className="block"
        >
          {children}
        </Link>
      );
    },
    [organizationId, releaseId]
  );

  // Generate progress data over time
  const progressData = useMemo(() => {
    if (tasks.length === 0) return [];

    const COMPLETED_STATUSES = ["done", "canceled"];

    // Find earliest and latest dates
    const now = new Date();
    let earliestDate = now;

    for (const task of tasks) {
      if (task.createdAt) {
        const created = new Date(task.createdAt);
        if (created < earliestDate) {
          earliestDate = created;
        }
      }
    }

    // If all tasks are very recent, go back at least 7 days
    const minStartDate = new Date(now);
    minStartDate.setDate(minStartDate.getDate() - 7);
    if (earliestDate > minStartDate) {
      earliestDate = minStartDate;
    }

    earliestDate.setHours(0, 0, 0, 0);

    // Create daily buckets
    const days = Math.ceil(
      (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dataPoints: Array<{
      date: string;
      completed: number;
      total: number;
    }> = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(earliestDate);
      date.setDate(date.getDate() + i);
      date.setHours(23, 59, 59, 999);

      let totalTasks = 0;
      let completedTasks = 0;

      for (const task of tasks) {
        if (!task.createdAt) continue;
        const taskCreated = new Date(task.createdAt);

        // Task exists by this date
        if (taskCreated <= date) {
          totalTasks++;

          // Check if completed by this date
          if (
            task.status &&
            COMPLETED_STATUSES.includes(task.status) &&
            task.updatedAt
          ) {
            const taskCompleted = new Date(task.updatedAt);
            if (taskCompleted <= date) {
              completedTasks++;
            }
          }
        }
      }

      dataPoints.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        completed: completedTasks,
        total: totalTasks,
      });
    }

    return dataPoints;
  }, [tasks]);

  const areaSeries: AreaChartSeries[] = [
    {
      key: "total",
      label: "Total Tasks",
      color: "hsl(240, 5%, 64%)",
      type: "area",
    },
    {
      key: "completed",
      label: "Completed",
      color: "hsl(142, 76%, 36%)",
      type: "area",
    },
  ];

  if (taskStats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <IconCheckbox className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
        <p className="text-sm text-muted-foreground">
          Tasks assigned to this release will appear in the charts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Release Progress Card */}
      <Tile className="md:w-full flex-col items-start gap-3">
        <TileHeader className="w-full">
          <TileIcon>
            <IconTrendingUp />
          </TileIcon>
          <TileTitle>Release Progress</TileTitle>
          <TileDescription>
            {taskStats.completed}/{taskStats.total} tasks completed
          </TileDescription>
        </TileHeader>
        <div className="w-full flex flex-col gap-2">
          <SimpleAreaChart
            data={progressData}
            xKey="date"
            series={areaSeries}
            size="md"
            stacked={false}
            gradient={true}
            showGrid={true}
            formatXAxis={() => ""}
          />
          <ReleaseStats
            items={[
              {
                label: "Completed",
                value: taskStats.completed,
                cssVar: "success",
              },
              {
                label: "In Progress",
                value: taskStats.inProgress,
                cssVar: "primary",
              },
              { label: "To Do", value: taskStats.todo, cssVar: "foreground" },
              {
                label: "Backlog",
                value: taskStats.backlog,
                cssVar: "muted-foreground",
              },
            ]}
          />
          {daysUntilTarget !== null && (
            <div className="pt-2 border-t">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  Target Date
                </span>
                <span className="font-medium text-sm">
                  {daysUntilTarget > 0
                    ? `${daysUntilTarget} days remaining`
                    : daysUntilTarget === 0
                      ? "Due today"
                      : `${Math.abs(daysUntilTarget)} days overdue`}
                </span>
              </div>
            </div>
          )}
        </div>
      </Tile>

      {/* Task Priority Distribution */}
      <Tile className="md:w-full flex-col items-start gap-3">
        <TileHeader className="w-full">
          <TileIcon>
            <IconChartBar />
          </TileIcon>
          <TileTitle>Priority Distribution</TileTitle>
          <TileDescription>Task breakdown by priority</TileDescription>
        </TileHeader>
        <TaskPriorityBar tasks={tasks} />
      </Tile>

      {/* Task Assignee Distribution */}
      <Tile className="md:w-full flex-col items-start gap-3">
        <TileHeader className="w-full">
          <TileIcon>
            <IconUsers />
          </TileIcon>
          <TileTitle>Assignee Workload</TileTitle>
          <TileDescription>Tasks assigned per team member</TileDescription>
        </TileHeader>
        <TaskAssigneeChart tasks={tasks} renderTileWrapper={renderTileWrapper} />
      </Tile>
    </div>
  );
}

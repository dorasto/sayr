"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleAreaChart, type AreaChartSeries } from "./simple-area-chart";

export interface TaskTimelineChartProps {
  tasks: schema.TaskWithLabels[];
  /** Number of days to show */
  days?: number;
  /** Size of the chart */
  size?: "sm" | "md" | "lg";
  /** Whether to show both created and completed lines */
  showCompleted?: boolean;
  /** Additional className */
  className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0] || "";
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskTimelineChart({
  tasks,
  days = 14,
  size = "md",
  className,
}: TaskTimelineChartProps) {
  const { chartData, series } = useMemo(() => {
    // Generate date range
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Initialize data buckets for status counts
    const dateMap = new Map<
      string,
      { backlog: number; todo: number; inProgress: number; done: number; canceled: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dateMap.set(formatDateKey(d), { backlog: 0, todo: 0, inProgress: 0, done: 0, canceled: 0 });
    }

    // For each day, count tasks that exist in each status at that point in time
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    for (const dateKey of sortedDates) {
      const currentDate = new Date(dateKey);
      currentDate.setHours(23, 59, 59, 999);
      
      const bucket = dateMap.get(dateKey);
      if (!bucket) continue;

      // For each task, determine its status on this date
      for (const task of tasks) {
        if (!task.createdAt) continue;
        
        const createdDate = new Date(task.createdAt);
        
        // Skip if task wasn't created yet
        if (createdDate > currentDate) continue;
        
        // Check if task was completed before this date
        if (task.status && COMPLETED_STATUSES.includes(task.status) && task.updatedAt) {
          const completedDate = new Date(task.updatedAt);
          // Skip if already completed before this date
          if (completedDate <= currentDate) {
            // Count completed tasks
            if (task.status === "done") bucket.done++;
            else if (task.status === "canceled") bucket.canceled++;
            continue;
          }
        }
        
        // Task exists and is not completed, count by status
        // Note: We don't have historical status data, so we use current status
        // This is a limitation but still shows general distribution trends
        const status = task.status || "backlog";
        if (status === "backlog") bucket.backlog++;
        else if (status === "todo") bucket.todo++;
        else if (status === "in-progress") bucket.inProgress++;
      }
    }

    // Convert to array format for chart
    const data = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: formatDateLabel(date),
        backlog: counts.backlog,
        todo: counts.todo,
        "in-progress": counts.inProgress,
      }));

    const seriesConfig: AreaChartSeries[] = [
      {
        key: "backlog",
        label: "Backlog",
        color: "hsl(0, 0%, 45%)", // Gray
        type: "area",
      },
      {
        key: "todo",
        label: "To Do",
        color: "hsl(217, 91%, 60%)", // Blue
        type: "area",
      },
      {
        key: "in-progress",
        label: "In Progress",
        color: "hsl(42, 96%, 50%)", // Yellow/Orange
        type: "area",
      },
    ];

    return { chartData: data, series: seriesConfig };
  }, [tasks, days]);

  // Check if there's any data worth showing
  const hasData = chartData.some((d) => d.backlog > 0 || d.todo > 0 || d["in-progress"] > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
        No activity in the last {days} days
      </div>
    );
  }

  return (
    <SimpleAreaChart
      data={chartData}
      xKey="date"
      series={series}
      size={size}
      stacked={true}
      gradient={true}
      showGrid={true}
      className={className}
      formatXAxis={(value) => value}
    />
  );
}

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
  return date.toISOString().split("T")[0];
}

function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskTimelineChart({
  tasks,
  days = 14,
  size = "md",
  showCompleted = true,
  className,
}: TaskTimelineChartProps) {
  const { chartData, series } = useMemo(() => {
    // Generate date range
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Initialize data buckets
    const dateMap = new Map<string, { created: number; completed: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dateMap.set(formatDateKey(d), { created: 0, completed: 0 });
    }

    // Count tasks by date
    for (const task of tasks) {
      // Count created tasks
      if (task.createdAt) {
        const createdDate = new Date(task.createdAt);
        const key = formatDateKey(createdDate);
        const bucket = dateMap.get(key);
        if (bucket) {
          bucket.created++;
        }
      }

      // Count completed tasks (using updatedAt as completion proxy)
      if (
        showCompleted &&
        COMPLETED_STATUSES.includes(task.status) &&
        task.updatedAt
      ) {
        const updatedDate = new Date(task.updatedAt);
        const key = formatDateKey(updatedDate);
        const bucket = dateMap.get(key);
        if (bucket) {
          bucket.completed++;
        }
      }
    }

    // Convert to array format for chart
    const data = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: formatDateLabel(date),
        created: counts.created,
        ...(showCompleted ? { completed: counts.completed } : {}),
      }));

    const seriesConfig: AreaChartSeries[] = [
      { key: "created", label: "Created", color: "var(--primary)" },
    ];

    if (showCompleted) {
      seriesConfig.push({
        key: "completed",
        label: "Closed",
        color: "var(--muted-foreground)",
      });
    }

    return { chartData: data, series: seriesConfig };
  }, [tasks, days, showCompleted]);

  // Check if there's any data worth showing
  const hasData = chartData.some(
    (d) =>
      d.created > 0 ||
      (showCompleted && (d as { completed?: number }).completed),
  );

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
      stacked={false}
      gradient={true}
      showGrid={true}
      className={className}
      formatXAxis={(value) => value}
    />
  );
}

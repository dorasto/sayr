"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { statusConfig, type StatusKey } from "@/components/tasks/shared/config";
import { SimplePieChart, type PieChartDataItem } from "./simple-pie-chart";

export interface TaskStatusChartProps {
  tasks: schema.TaskWithLabels[];
  /** Which statuses to include. Defaults to active statuses (backlog, todo, in-progress) */
  statuses?: StatusKey[];
  /** Size of the chart */
  size?: "sm" | "md" | "lg";
  /** Whether to show the total in the center */
  showTotal?: boolean;
  /** Label for the total */
  totalLabel?: string;
  /** Additional className */
  className?: string;
}

const ACTIVE_STATUSES: StatusKey[] = ["backlog", "todo", "in-progress"];
const ALL_STATUSES: StatusKey[] = [
  "backlog",
  "todo",
  "in-progress",
  "done",
  "canceled",
];

export function TaskStatusChart({
  tasks,
  statuses = ACTIVE_STATUSES,
  size = "md",
  showTotal = true,
  totalLabel,
  className,
}: TaskStatusChartProps) {
  const chartData = useMemo((): PieChartDataItem[] => {
    // Count tasks by status
    const statusCounts = new Map<StatusKey, number>();

    // Initialize counts for requested statuses
    for (const status of statuses) {
      statusCounts.set(status, 0);
    }

    // Count tasks
    for (const task of tasks) {
      const status = task.status as StatusKey;
      if (statuses.includes(status)) {
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      }
    }

    // Transform to chart data format
    return statuses
      .map((status) => ({
        name: status,
        value: statusCounts.get(status) || 0,
        color: statusConfig[status].color,
        label: statusConfig[status].label,
      }))
      .filter((item) => item.value > 0); // Only include statuses with tasks
  }, [tasks, statuses]);

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
        No tasks to display
      </div>
    );
  }

  return (
    <SimplePieChart
      data={chartData}
      size={size}
      showTotal={showTotal}
      totalLabel={totalLabel}
      className={className}
    />
  );
}

// Export constants for convenience
export { ACTIVE_STATUSES, ALL_STATUSES };

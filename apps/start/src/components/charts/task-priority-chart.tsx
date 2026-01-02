"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { priorityConfig, type PriorityKey } from "@/components/tasks/shared/config";
import { SimplePieChart, type PieChartDataItem } from "./simple-pie-chart";

export interface TaskPriorityChartProps {
   tasks: schema.TaskWithLabels[];
   /** Which priorities to include. Defaults to all priorities */
   priorities?: PriorityKey[];
   /** Size of the chart */
   size?: "sm" | "md" | "lg";
   /** Whether to show the total in the center */
   showTotal?: boolean;
   /** Label for the total */
   totalLabel?: string;
   /** Additional className */
   className?: string;
}

const ALL_PRIORITIES: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];

export function TaskPriorityChart({
   tasks,
   priorities = ALL_PRIORITIES,
   size = "md",
   showTotal = true,
   totalLabel,
   className,
}: TaskPriorityChartProps) {
   const chartData = useMemo((): PieChartDataItem[] => {
      // Count tasks by priority
      const priorityCounts = new Map<PriorityKey, number>();

      // Initialize counts for requested priorities
      for (const priority of priorities) {
         priorityCounts.set(priority, 0);
      }

      // Count tasks
      for (const task of tasks) {
         const priority = (task.priority as PriorityKey) || "none";
         if (priorities.includes(priority)) {
            priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
         }
      }

      // Transform to chart data format
      return priorities
         .map((priority) => ({
            name: priority,
            value: priorityCounts.get(priority) || 0,
            color: priorityConfig[priority].color,
            label: priorityConfig[priority].label,
         }))
         .filter((item) => item.value > 0);
   }, [tasks, priorities]);

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

export { ALL_PRIORITIES };

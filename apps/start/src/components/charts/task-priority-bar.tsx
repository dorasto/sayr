"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { priorityConfig, type PriorityKey } from "@/components/tasks/shared/config";
import { SimpleBarChart, type BarChartDataItem } from "./simple-bar-chart";

export interface TaskPriorityBarProps {
   tasks: schema.TaskWithLabels[];
   /** Size of the chart */
   size?: "sm" | "md" | "lg";
   /** Show labels */
   showLabels?: boolean;
   /** Additional className */
   className?: string;
}

const PRIORITY_ORDER: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];

export function TaskPriorityBar({
   tasks,
   size = "md",
   showLabels = true,
   className,
}: TaskPriorityBarProps) {
   const chartData = useMemo((): BarChartDataItem[] => {
      const counts = new Map<PriorityKey, number>();

      // Initialize all priorities
      for (const p of PRIORITY_ORDER) {
         counts.set(p, 0);
      }

      // Count tasks by priority
      for (const task of tasks) {
         const priority = (task.priority as PriorityKey) || "none";
         counts.set(priority, (counts.get(priority) || 0) + 1);
      }

      // Build chart data in priority order
      return PRIORITY_ORDER.map((priority) => ({
         name: priority,
         value: counts.get(priority) || 0,
         color: priorityConfig[priority].color,
         label: priorityConfig[priority].label,
      }));
   }, [tasks]);

   if (tasks.length === 0) {
      return (
         <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
            No tasks to display
         </div>
      );
   }

   return (
      <SimpleBarChart
         data={chartData}
         layout="horizontal"
         size={size}
         showLabels={showLabels}
         className={className}
      />
   );
}

"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleRadialChart } from "./simple-radial-chart";

export interface TaskCompletionChartProps {
   tasks: schema.TaskWithLabels[];
   /** Size of the chart */
   size?: "sm" | "md" | "lg";
   /** Label to show below percentage */
   label?: string;
   /** Color for completed portion */
   completedColor?: string;
   /** Additional className */
   className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

export function TaskCompletionChart({
   tasks,
   size = "md",
   label = "Completed",
   completedColor = "#10B981",
   className,
}: TaskCompletionChartProps) {
   const { completedCount, totalCount, percentage } = useMemo(() => {
      const total = tasks.length;
      const completed = tasks.filter((task) => COMPLETED_STATUSES.includes(task.status)).length;
      const pct = total > 0 ? (completed / total) * 100 : 0;

      return {
         completedCount: completed,
         totalCount: total,
         percentage: pct,
      };
   }, [tasks]);

   if (totalCount === 0) {
      return (
         <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
            No tasks to display
         </div>
      );
   }

   return (
      <SimpleRadialChart
         value={percentage}
         max={100}
         label={label}
         color={completedColor}
         size={size}
         className={className}
         formatValue={(v) => `${Math.round(v)}%`}
      />
   );
}

export interface TaskCompletionStatsProps {
   tasks: schema.TaskWithLabels[];
}

export function useTaskCompletionStats(tasks: schema.TaskWithLabels[]) {
   return useMemo(() => {
      const total = tasks.length;
      const completed = tasks.filter((task) => COMPLETED_STATUSES.includes(task.status)).length;
      const active = total - completed;
      const percentage = total > 0 ? (completed / total) * 100 : 0;

      return {
         total,
         completed,
         active,
         percentage,
      };
   }, [tasks]);
}

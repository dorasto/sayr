"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleBarChart, type BarChartDataItem } from "./simple-bar-chart";

export interface TaskAssigneeChartProps {
   tasks: schema.TaskWithLabels[];
   /** Maximum number of assignees to show */
   maxItems?: number;
   /** Size of the chart */
   size?: "sm" | "md" | "lg";
   /** Show labels on bars */
   showLabels?: boolean;
   /** Additional className */
   className?: string;
   /** Default color for assignee bars */
   color?: string;
}

const COLORS = [
   "#3B82F6", // blue
   "#10B981", // green
   "#F59E0B", // amber
   "#8B5CF6", // violet
   "#EC4899", // pink
   "#06B6D4", // cyan
   "#EF4444", // red
   "#84CC16", // lime
];

export function TaskAssigneeChart({
   tasks,
   maxItems = 8,
   size = "md",
   showLabels = true,
   className,
}: TaskAssigneeChartProps) {
   const chartData = useMemo((): BarChartDataItem[] => {
      const assigneeCounts = new Map<string, { name: string; count: number }>();

      // Count tasks per assignee
      for (const task of tasks) {
         if (task.assignees && task.assignees.length > 0) {
            for (const assignee of task.assignees) {
               const existing = assigneeCounts.get(assignee.id);
               if (existing) {
                  existing.count++;
               } else {
                  assigneeCounts.set(assignee.id, {
                     name: assignee.name || "Unknown",
                     count: 1,
                  });
               }
            }
         } else {
            const existing = assigneeCounts.get("unassigned");
            if (existing) {
               existing.count++;
            } else {
               assigneeCounts.set("unassigned", { name: "Unassigned", count: 1 });
            }
         }
      }

      // Convert to array and sort by count descending
      const sorted = Array.from(assigneeCounts.entries())
         .map(([id, data], index) => ({
            name: id,
            value: data.count,
            color: id === "unassigned" ? "#9CA3AF" : COLORS[index % COLORS.length],
            label: data.name,
         }))
         .sort((a, b) => {
            // Keep unassigned at the end
            if (a.name === "unassigned") return 1;
            if (b.name === "unassigned") return -1;
            return b.value - a.value;
         });

      return sorted.slice(0, maxItems);
   }, [tasks, maxItems]);

   if (chartData.length === 0) {
      return (
         <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
            No tasks to display
         </div>
      );
   }

   return (
      <SimpleBarChart
         data={chartData}
         layout="vertical"
         size={size}
         showLabels={showLabels}
         className={className}
         emptyMessage="No tasks to display"
      />
   );
}

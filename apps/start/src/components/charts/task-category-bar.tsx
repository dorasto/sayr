"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleBarChart, type BarChartDataItem } from "./simple-bar-chart";

export interface TaskCategoryBarProps {
   tasks: schema.TaskWithLabels[];
   /** Available categories for color matching */
   categories?: schema.categoryType[];
   /** Size of the chart */
   size?: "sm" | "md" | "lg";
   /** Show labels */
   showLabels?: boolean;
   /** Additional className */
   className?: string;
}

const DEFAULT_CATEGORY_COLOR = "#9CA3AF";

export function TaskCategoryBar({
   tasks,
   categories = [],
   size = "md",
   showLabels = true,
   className,
}: TaskCategoryBarProps) {
   const chartData = useMemo((): BarChartDataItem[] => {
      const categoryCounts = new Map<string, { name: string; color: string; count: number }>();

      // Create lookup for category colors
      const categoryLookup = new Map(categories.map((c) => [c.id, c]));

      // Count tasks by category
      for (const task of tasks) {
         let categoryId: string;
         let categoryName: string;
         let categoryColor: string;

         if (task.category) {
            if (typeof task.category === "string") {
               categoryId = task.category;
               const cat = categoryLookup.get(task.category);
               categoryName = cat?.name || "Unknown";
               categoryColor = cat?.color || DEFAULT_CATEGORY_COLOR;
            } else {
               const cat = task.category as schema.categoryType;
               categoryId = cat.id;
               categoryName = cat.name;
               categoryColor = cat.color || DEFAULT_CATEGORY_COLOR;
            }
         } else {
            categoryId = "uncategorized";
            categoryName = "No category";
            categoryColor = DEFAULT_CATEGORY_COLOR;
         }

         const existing = categoryCounts.get(categoryId);
         if (existing) {
            existing.count++;
         } else {
            categoryCounts.set(categoryId, {
               name: categoryName,
               color: categoryColor,
               count: 1,
            });
         }
      }

      // Convert to chart data format and sort by count (uncategorized at end)
      return Array.from(categoryCounts.entries())
         .map(([id, data]) => ({
            name: id,
            value: data.count,
            color: data.color,
            label: data.name,
         }))
         .sort((a, b) => {
            // Keep uncategorized at the end
            if (a.name === "uncategorized") return 1;
            if (b.name === "uncategorized") return -1;
            return b.value - a.value;
         })
         .filter((item) => item.value > 0);
   }, [tasks, categories]);

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
      />
   );
}

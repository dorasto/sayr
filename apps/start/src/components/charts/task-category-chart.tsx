"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimplePieChart, type PieChartDataItem } from "./simple-pie-chart";

export interface TaskCategoryChartProps {
	tasks: schema.TaskWithLabels[];
	/** Available categories for color matching */
	categories?: schema.categoryType[];
	/** Size of the chart */
	size?: "sm" | "md" | "lg";
	/** Whether to show the total in the center */
	showTotal?: boolean;
	/** Label for the total */
	totalLabel?: string;
	/** Additional className */
	className?: string;
}

const DEFAULT_CATEGORY_COLOR = "#9CA3AF";

export function TaskCategoryChart({
	tasks,
	categories = [],
	size = "md",
	showTotal = true,
	totalLabel,
	className,
}: TaskCategoryChartProps) {
	const chartData = useMemo((): PieChartDataItem[] => {
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

		// Convert to chart data format
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
		<SimplePieChart
			data={chartData}
			size={size}
			showTotal={showTotal}
			totalLabel={totalLabel}
			className={className}
		/>
	);
}

"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleBarChart, type BarChartDataItem } from "./simple-bar-chart";

export interface TaskLabelDistributionChartProps {
	tasks: schema.TaskWithLabels[];
	/** Maximum number of labels to show (rest grouped as "Other") */
	maxItems?: number;
	/** Size of the chart */
	size?: "sm" | "md" | "lg";
	/** Additional className */
	className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

export function TaskLabelDistributionChart({
	tasks,
	maxItems = 6,
	size = "md",
	className,
}: TaskLabelDistributionChartProps) {
	const { chartData } = useMemo(() => {
		// Filter to open tasks only
		const openTasks = tasks.filter((task) => !task.status || !COMPLETED_STATUSES.includes(task.status));

		// Count tasks by label
		const labelCounts = new Map<string, { name: string; count: number; color: string }>();

		for (const task of openTasks) {
			if (!task.labels || task.labels.length === 0) {
				// Count unlabeled tasks
				const existing = labelCounts.get("no-label");
				if (existing) {
					existing.count++;
				} else {
					labelCounts.set("no-label", {
						name: "No Label",
						count: 1,
						color: "hsl(240, 5%, 64%)",
					});
				}
			} else {
				// Count each label
				for (const label of task.labels) {
					const existing = labelCounts.get(label.id);
					if (existing) {
						existing.count++;
					} else {
						labelCounts.set(label.id, {
							name: label.name,
							count: 1,
							color: label.color || "hsl(200, 70%, 50%)",
						});
					}
				}
			}
		}

		// Sort by count and take top N
		const sortedLabels = Array.from(labelCounts.values()).sort((a, b) => b.count - a.count);

		let data: BarChartDataItem[];
		if (sortedLabels.length > maxItems) {
			const topLabels = sortedLabels.slice(0, maxItems - 1);
			const otherCount = sortedLabels.slice(maxItems - 1).reduce((sum, label) => sum + label.count, 0);

			data = [
				...topLabels.map((label) => ({
					name: label.name,
					value: label.count,
					color: label.color,
				})),
				{
					name: "Other",
					value: otherCount,
					color: "hsl(280, 50%, 60%)",
				},
			];
		} else {
			data = sortedLabels.map((label) => ({
				name: label.name,
				value: label.count,
				color: label.color,
			}));
		}

		return { chartData: data };
	}, [tasks, maxItems]);

	// Check if there's any data worth showing
	const hasData = chartData.some((d) => d.value > 0);

	if (!hasData) {
		return (
			<div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">No open tasks</div>
		);
	}

	return (
		<SimpleBarChart
			data={chartData}
			layout="horizontal"
			size={size}
			className={className}
			showLabels={true}
			showGrid={true}
		/>
	);
}

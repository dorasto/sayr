"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleBarChart, type BarChartDataItem } from "./simple-bar-chart";

export interface TaskAgeChartProps {
	tasks: schema.TaskWithLabels[];
	/** Size of the chart */
	size?: "sm" | "md" | "lg";
	/** Additional className */
	className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

function calculateTaskAge(task: schema.TaskWithLabels): number | null {
	if (!task.createdAt) return null;
	if (task.status && COMPLETED_STATUSES.includes(task.status)) return null;

	const created = new Date(task.createdAt);
	const now = new Date();
	const ageInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

	return Math.floor(ageInDays);
}

export function TaskAgeChart({ tasks, size = "md", className }: TaskAgeChartProps) {
	const { chartData } = useMemo(() => {
		// Define age buckets (in days)
		const buckets = [
			{ name: "0-7 days", min: 0, max: 7, count: 0, color: "hsl(142, 76%, 36%)" },
			{ name: "8-14 days", min: 8, max: 14, count: 0, color: "hsl(47, 96%, 53%)" },
			{ name: "15-30 days", min: 15, max: 30, count: 0, color: "hsl(24, 100%, 50%)" },
			{ name: "31-60 days", min: 31, max: 60, count: 0, color: "hsl(0, 84%, 60%)" },
			{ name: "60+ days", min: 61, max: Number.POSITIVE_INFINITY, count: 0, color: "hsl(0, 72%, 51%)" },
		];

		// Count tasks by age
		for (const task of tasks) {
			const age = calculateTaskAge(task);
			if (age === null) continue;

			for (const bucket of buckets) {
				if (age >= bucket.min && age <= bucket.max) {
					bucket.count++;
					break;
				}
			}
		}

		// Convert to chart data format
		const data: BarChartDataItem[] = buckets.map((bucket) => ({
			name: bucket.name,
			value: bucket.count,
			color: bucket.color,
		}));

		return { chartData: data };
	}, [tasks]);

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

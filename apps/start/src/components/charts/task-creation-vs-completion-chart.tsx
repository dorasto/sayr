"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleAreaChart, type AreaChartSeries } from "./simple-area-chart";

export interface TaskCreationVsCompletionChartProps {
	tasks: schema.TaskWithLabels[];
	/** Number of weeks to show */
	weeks?: number;
	/** Size of the chart */
	size?: "sm" | "md" | "lg";
	/** Additional className */
	className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

function formatWeekKey(date: Date): string {
	const year = date.getFullYear();
	const week = getWeekNumber(date);
	return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatWeekLabel(weekKey: string): string {
	const parts = weekKey.split("-W");
	if (parts.length !== 2) return weekKey;
	const year = parts[0];
	const week = parts[1];
	if (!year || !week) return weekKey;
	const weekNum = week.padStart(2, "0");
	return `${year.slice(2)}W${weekNum}`;
}

export function TaskCreationVsCompletionChart({
	tasks,
	weeks = 8,
	size = "md",
	className,
}: TaskCreationVsCompletionChartProps) {
	const { chartData, series } = useMemo(() => {
		// Generate week range
		const today = new Date();
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - weeks * 7);

		// Initialize data buckets
		const weekMap = new Map<string, { created: number; completed: number }>();
		for (let i = 0; i < weeks; i++) {
			const d = new Date(startDate);
			d.setDate(d.getDate() + i * 7);
			weekMap.set(formatWeekKey(d), { created: 0, completed: 0 });
		}

		// Count tasks by week
		for (const task of tasks) {
			// Count created tasks
			if (task.createdAt) {
				const createdDate = new Date(task.createdAt);
				const weekKey = formatWeekKey(createdDate);

				if (!weekMap.has(weekKey)) {
					weekMap.set(weekKey, { created: 0, completed: 0 });
				}

				const bucket = weekMap.get(weekKey);
				if (bucket) {
					bucket.created++;
				}
			}

			// Count completed tasks
			if (task.status && COMPLETED_STATUSES.includes(task.status) && task.updatedAt) {
				const completedDate = new Date(task.updatedAt);
				const weekKey = formatWeekKey(completedDate);

				if (!weekMap.has(weekKey)) {
					weekMap.set(weekKey, { created: 0, completed: 0 });
				}

				const bucket = weekMap.get(weekKey);
				if (bucket) {
					bucket.completed++;
				}
			}
		}

		// Convert to array format for chart
		const data = Array.from(weekMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([week, counts]) => ({
				week: formatWeekLabel(week),
				created: counts.created,
				completed: counts.completed,
			}));

		const seriesConfig: AreaChartSeries[] = [
			{
				key: "created",
				label: "Created",
				color: "hsl(217, 91%, 60%)",
				type: "line",
				strokeWidth: 3,
			},
			{
				key: "completed",
				label: "Completed",
				color: "hsl(142, 76%, 36%)",
				type: "line",
				strokeWidth: 3,
			},
		];

		return { chartData: data, series: seriesConfig };
	}, [tasks, weeks]);

	// Check if there's any data worth showing
	const hasData = chartData.some((d) => d.created > 0 || d.completed > 0);

	if (!hasData) {
		return (
			<div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
				No activity in the last {weeks} weeks
			</div>
		);
	}

	return (
		<SimpleAreaChart
			data={chartData}
			xKey="week"
			series={series}
			size={size}
			stacked={false}
			gradient={false}
			showGrid={true}
			className={className}
			formatXAxis={(value) => value}
		/>
	);
}

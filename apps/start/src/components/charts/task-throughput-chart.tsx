"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleBarChart } from "./simple-bar-chart";

export interface TaskThroughputChartProps {
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

export function TaskThroughputChart({ tasks, weeks = 8, size = "md", className }: TaskThroughputChartProps) {
	const { chartData } = useMemo(() => {
		// Debug: Log completed tasks
		const completedTasks = tasks.filter((task) => task.status && COMPLETED_STATUSES.includes(task.status));
		// console.log("📈 Throughput Chart Debug:", {
		// 	totalTasks: tasks.length,
		// 	completedTasks: completedTasks.length,
		// 	sampleCompletedTasks: completedTasks.slice(0, 3).map((t) => ({
		// 		title: t.title,
		// 		status: t.status,
		// 		updatedAt: t.updatedAt,
		// 	})),
		// });

		// Generate week range
		const today = new Date();
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - weeks * 7);

		// Initialize data buckets
		const weekMap = new Map<string, number>();
		for (let i = 0; i < weeks; i++) {
			const d = new Date(startDate);
			d.setDate(d.getDate() + i * 7);
			weekMap.set(formatWeekKey(d), 0);
		}

		// Count completed tasks per week
		for (const task of tasks) {
			if (!task.status || !COMPLETED_STATUSES.includes(task.status)) continue;
			if (!task.updatedAt) continue;

			const completedDate = new Date(task.updatedAt);
			const weekKey = formatWeekKey(completedDate);

			// Create bucket if it doesn't exist
			if (!weekMap.has(weekKey)) {
				weekMap.set(weekKey, 0);
			}

			const count = weekMap.get(weekKey);
			if (count !== undefined) {
				weekMap.set(weekKey, count + 1);
			}
		}

		// Convert to array format for chart
		const data = Array.from(weekMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([week, count]) => ({
				name: formatWeekLabel(week),
				value: count,
				color: "hsl(142, 76%, 36%)",
			}));

		return { chartData: data };
	}, [tasks, weeks]);

	// Check if there's any data worth showing
	const hasData = chartData.some((d) => d.value > 0);

	if (!hasData) {
		return (
			<div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
				No completed tasks in the last {weeks} weeks
			</div>
		);
	}

	return <SimpleBarChart data={chartData} size={size} className={className} showLabels={true} showGrid={true} />;
}

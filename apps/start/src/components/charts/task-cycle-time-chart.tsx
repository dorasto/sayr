"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleAreaChart, type AreaChartSeries } from "./simple-area-chart";

export interface TaskCycleTimeChartProps {
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

function calculateCycleTime(task: schema.TaskWithLabels): number | null {
	if (!task.status || !COMPLETED_STATUSES.includes(task.status)) {
		return null;
	}
	
	if (!task.createdAt || !task.updatedAt) {
		return null;
	}

	const created = new Date(task.createdAt);
	const completed = new Date(task.updatedAt);
	const diffInDays = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

	return Math.max(0, diffInDays);
}

export function TaskCycleTimeChart({
	tasks,
	weeks = 8,
	size = "md",
	className,
}: TaskCycleTimeChartProps) {
	const { chartData, series } = useMemo(() => {
		// Debug: Log all tasks and their statuses
		const completedTasks = tasks.filter((task) => 
			task.status && COMPLETED_STATUSES.includes(task.status)
		);
		console.log("📊 Cycle Time Chart Debug:", {
			totalTasks: tasks.length,
			completedTasks: completedTasks.length,
			statuses: tasks.reduce((acc, t) => {
				const status = t.status || "unknown";
				acc[status] = (acc[status] || 0) + 1;
				return acc;
			}, {} as Record<string, number>),
			sampleCompletedTasks: completedTasks.slice(0, 3).map(t => ({
				title: t.title,
				status: t.status,
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
			})),
		});

		// Generate week range
		const today = new Date();
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - weeks * 7);

		// Initialize data buckets
		const weekMap = new Map<string, { totalCycleTime: number; count: number }>();
		for (let i = 0; i < weeks; i++) {
			const d = new Date(startDate);
			d.setDate(d.getDate() + i * 7);
			weekMap.set(formatWeekKey(d), { totalCycleTime: 0, count: 0 });
		}

		// Calculate cycle times for completed tasks
		for (const task of tasks) {
			const cycleTime = calculateCycleTime(task);
			if (cycleTime === null || !task.updatedAt) continue;

			const completedDate = new Date(task.updatedAt);
			const weekKey = formatWeekKey(completedDate);
			
			// Create bucket if it doesn't exist (for tasks completed before date range)
			if (!weekMap.has(weekKey)) {
				weekMap.set(weekKey, { totalCycleTime: 0, count: 0 });
			}
			
			const bucket = weekMap.get(weekKey);
			if (bucket) {
				bucket.totalCycleTime += cycleTime;
				bucket.count++;
			}
		}

		// Convert to array format for chart (average cycle time)
		const data = Array.from(weekMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([week, stats]) => ({
				week: formatWeekLabel(week),
				avgCycleTime: stats.count > 0 ? Number((stats.totalCycleTime / stats.count).toFixed(1)) : 0,
			}));

		const seriesConfig: AreaChartSeries[] = [
			{
				key: "avgCycleTime",
				label: "Avg Cycle Time (days)",
				color: "hsl(217, 91%, 60%)",
				type: "line",
				strokeWidth: 3,
			},
		];

		return { chartData: data, series: seriesConfig };
	}, [tasks, weeks]);

	// Check if there's any data worth showing
	const hasData = chartData.some((d) => d.avgCycleTime > 0);

	if (!hasData) {
		return (
			<div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
				No completed tasks in the last {weeks} weeks
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

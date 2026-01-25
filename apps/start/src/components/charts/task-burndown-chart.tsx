"use client";

import type { schema } from "@repo/database";
import { useMemo } from "react";
import { SimpleAreaChart, type AreaChartSeries } from "./simple-area-chart";

export interface TaskBurndownChartProps {
	tasks: schema.TaskWithLabels[];
	/** Target date for completion (defaults to 2 weeks from now) */
	targetDate?: Date;
	/** Size of the chart */
	size?: "sm" | "md" | "lg";
	/** Additional className */
	className?: string;
}

const COMPLETED_STATUSES = ["done", "canceled"];

function formatDateKey(date: Date): string {
	return date.toISOString().split("T")[0] || "";
}

function formatDateLabel(dateKey: string): string {
	const date = new Date(dateKey);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskBurndownChart({ tasks, targetDate, size = "md", className }: TaskBurndownChartProps) {
	const { chartData, series } = useMemo(() => {
		// Default target date is 2 weeks from now
		const target = targetDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

		// Find the earliest task creation date or use 14 days ago
		const today = new Date();
		today.setHours(23, 59, 59, 999);

		let startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 14);

		for (const task of tasks) {
			if (task.createdAt) {
				const created = new Date(task.createdAt);
				if (created < startDate) {
					startDate = created;
				}
			}
		}

		startDate.setHours(0, 0, 0, 0);

		// Calculate number of days
		const days = Math.ceil((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

		// Initialize data buckets
		const dateMap = new Map<string, { actual: number; ideal: number }>();
		for (let i = 0; i <= days; i++) {
			const d = new Date(startDate);
			d.setDate(d.getDate() + i);
			dateMap.set(formatDateKey(d), { actual: 0, ideal: 0 });
		}

		// Count initial open tasks (at start date)
		let initialCount = 0;
		for (const task of tasks) {
			if (!task.createdAt) continue;
			const created = new Date(task.createdAt);

			if (created <= startDate) {
				// Task existed at start
				if (task.status && COMPLETED_STATUSES.includes(task.status) && task.updatedAt) {
					const completed = new Date(task.updatedAt);
					if (completed > startDate) {
						// Completed after start, so was open at start
						initialCount++;
					}
				} else {
					// Still open
					initialCount++;
				}
			}
		}

		// Calculate ideal burndown line (linear decrease)
		const idealDecreasePerDay = initialCount / days;
		let currentIdeal = initialCount;

		// Calculate actual remaining tasks for each day
		const sortedDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));

		let cumulativeOpen = initialCount;

		for (const dateKey of sortedDates) {
			const bucket = dateMap.get(dateKey);
			if (!bucket) continue;

			const currentDate = new Date(dateKey);
			currentDate.setHours(23, 59, 59, 999);

			// Calculate tasks created and completed on this day
			let created = 0;
			let completed = 0;

			for (const task of tasks) {
				if (task.createdAt) {
					const taskCreated = new Date(task.createdAt);
					const taskCreatedKey = formatDateKey(taskCreated);
					if (taskCreatedKey === dateKey && taskCreated > startDate) {
						created++;
					}
				}

				if (task.status && COMPLETED_STATUSES.includes(task.status) && task.updatedAt) {
					const taskCompleted = new Date(task.updatedAt);
					const taskCompletedKey = formatDateKey(taskCompleted);
					if (taskCompletedKey === dateKey) {
						completed++;
					}
				}
			}

			cumulativeOpen = cumulativeOpen + created - completed;

			bucket.actual = Math.max(0, cumulativeOpen);
			bucket.ideal = Math.max(0, currentIdeal);

			currentIdeal -= idealDecreasePerDay;
		}

		// Convert to array format for chart
		const data = Array.from(dateMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, counts]) => ({
				date: formatDateLabel(date),
				actual: counts.actual,
				ideal: counts.ideal,
			}));

		const seriesConfig: AreaChartSeries[] = [
			{
				key: "ideal",
				label: "Ideal",
				color: "hsl(240, 5%, 64%)",
				type: "line",
				strokeWidth: 2,
			},
			{
				key: "actual",
				label: "Actual",
				color: "hsl(217, 91%, 60%)",
				type: "line",
				strokeWidth: 3,
			},
		];

		return { chartData: data, series: seriesConfig };
	}, [tasks, targetDate]);

	// Check if there's any data worth showing
	const hasData = chartData.some((d) => d.actual > 0 || d.ideal > 0);

	if (!hasData) {
		return (
			<div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
				No tasks to track
			</div>
		);
	}

	return (
		<SimpleAreaChart
			data={chartData}
			xKey="date"
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

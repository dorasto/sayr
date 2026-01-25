"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import { Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

export interface AreaChartSeries {
	key: string;
	label: string;
	color: string;
	type?: "area" | "bar" | "line";
	strokeWidth?: number;
}

export interface SimpleAreaChartProps {
	/** Data array with xKey and series values */
	data: Record<string, string | number>[];
	/** Key for the X axis (e.g., "date", "month") */
	xKey: string;
	/** Series configuration */
	series: AreaChartSeries[];
	/** Size of the chart container */
	size?: "sm" | "md" | "lg";
	/** Whether to stack the areas */
	stacked?: boolean;
	/** Show gradient fill */
	gradient?: boolean;
	/** Show grid lines */
	showGrid?: boolean;
	/** Additional className for the container */
	className?: string;
	/** Format function for X axis labels */
	formatXAxis?: (value: string) => string;
	/** Empty state message */
	emptyMessage?: string;
}

const SIZE_CONFIG = {
	sm: { container: "h-[120px]" },
	md: { container: "h-[180px]" },
	lg: { container: "h-[250px]" },
};

export function SimpleAreaChart({
	data,
	xKey,
	series,
	size = "md",
	stacked = false,
	gradient = true,
	showGrid = true,
	className,
	formatXAxis = (value) => value,
	emptyMessage = "No data to display",
}: SimpleAreaChartProps) {
	const sizeConfig = SIZE_CONFIG[size];

	if (data.length === 0) {
		return (
			<div
				className={cn(
					"flex items-center justify-center text-muted-foreground text-sm w-full",
					sizeConfig.container,
					className
				)}
			>
				{emptyMessage}
			</div>
		);
	}

	// Build chart config from series
	const chartConfig: ChartConfig = Object.fromEntries(
		series.map((s) => [
			s.key,
			{
				label: s.label,
				color: s.color,
			},
		])
	);

	return (
		<ChartContainer config={chartConfig} className={cn("w-full", sizeConfig.container, className)}>
			<ComposedChart accessibilityLayer data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
				{showGrid && <CartesianGrid vertical={false} />}
				<XAxis
					dataKey={xKey}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={formatXAxis}
					fontSize={11}
				/>
				<YAxis hide />
				<ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
				{gradient && (
					<defs>
						{series.map((s) => (
							<linearGradient key={`gradient-${s.key}`} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
								<stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
							</linearGradient>
						))}
					</defs>
				)}
				{/* Render bars first (behind) */}
				{series
					.filter((s) => s.type === "bar")
					.map((s) => (
						<Bar key={s.key} dataKey={s.key} fill={s.color} fillOpacity={0.8} radius={[4, 4, 0, 0]} />
					))}
				{/* Render areas second */}
				{series
					.filter((s) => s.type !== "bar" && s.type !== "line")
					.map((s) => (
						<Area
							key={s.key}
							dataKey={s.key}
							type="monotone"
							fill={gradient ? `url(#fill-${s.key})` : s.color}
							fillOpacity={gradient ? 0.4 : 0.2}
							stroke={s.color}
							strokeWidth={2}
							stackId={stacked ? "stack" : undefined}
						/>
					))}
				{/* Render lines on top */}
				{series
					.filter((s) => s.type === "line")
					.map((s) => (
						<Line
							key={s.key}
							dataKey={s.key}
							type="monotone"
							stroke={s.color}
							strokeWidth={s.strokeWidth || 3}
							dot={false}
						/>
					))}
			</ComposedChart>
		</ChartContainer>
	);
}

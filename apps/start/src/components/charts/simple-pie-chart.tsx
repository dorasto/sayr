"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import { Cell, Pie, PieChart, Label, type PieLabelRenderProps } from "recharts";

export interface PieChartDataItem {
	name: string;
	value: number;
	color: string;
	label?: string;
}

export interface SimplePieChartProps {
	data: PieChartDataItem[];
	/** Size of the chart container */
	size?: "sm" | "md" | "lg";
	/** Whether to show a center label with total */
	showTotal?: boolean;
	/** Label for the total (e.g., "Tasks", "Items") */
	totalLabel?: string;
	/** Inner radius ratio (0-1) for donut style. 0 = filled pie, 0.6 = donut */
	innerRadius?: number;
	/** Outer radius ratio (0-1) */
	outerRadius?: number;
	/** Additional className for the container */
	className?: string;
	/** Data key for the value field */
	dataKey?: string;
	/** Name key for the label field */
	nameKey?: string;
}

const SIZE_CONFIG = {
	sm: { container: "max-h-[150px]", outerRadius: 60, innerRadius: 40 },
	md: { container: "max-h-[200px]", outerRadius: 80, innerRadius: 55 },
	lg: { container: "max-h-[250px]", outerRadius: 100, innerRadius: 70 },
};

export function SimplePieChart({
	data,
	size = "md",
	showTotal = true,
	totalLabel,
	innerRadius: customInnerRadius,
	outerRadius: customOuterRadius,
	className,
	dataKey = "value",
	nameKey = "name",
}: SimplePieChartProps) {
	const sizeConfig = SIZE_CONFIG[size];

	// Calculate total
	const total = data.reduce((sum, item) => sum + item.value, 0);

	// Build chart config from data
	const chartConfig: ChartConfig = {
		[dataKey]: { label: totalLabel },
		...Object.fromEntries(
			data.map((item) => [
				item.name,
				{
					label: item.label || item.name,
					color: item.color,
				},
			])
		),
	};

	// Transform data for recharts
	const chartData = data.map((item) => ({
		[nameKey]: item.name,
		[dataKey]: item.value,
		fill: item.color,
		label: item.label || item.name,
	}));

	const outerRadius = customOuterRadius ? customOuterRadius * sizeConfig.outerRadius : sizeConfig.outerRadius;
	const innerRadius =
		customInnerRadius !== undefined ? customInnerRadius * sizeConfig.outerRadius : sizeConfig.innerRadius;

	return (
		<ChartContainer config={chartConfig} className={cn("aspect-square w-full", sizeConfig.container, className)}>
			<PieChart>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							hideLabel
							nameKey={nameKey}
							indicator="dot"
							formatter={(value, _name, item) => (
								<>
									<div
										className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
										style={{
											backgroundColor: item.payload.fill,
										}}
									/>
									<div className="flex flex-1 items-center justify-between gap-2">
										<span className="text-muted-foreground">{item.payload.label}</span>
										<span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
									</div>
								</>
							)}
						/>
					}
				/>
				<Pie
					data={chartData}
					dataKey={dataKey}
					nameKey={nameKey}
					innerRadius={innerRadius}
					outerRadius={outerRadius}
					strokeWidth={2}
					stroke="hsl(var(--background))"
				>
					{chartData.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={entry.fill} />
					))}
					{showTotal && (
						<Label
							content={(props: PieLabelRenderProps) => {
								const viewBox = props.viewBox as { cx?: number; cy?: number };
								if (viewBox && viewBox.cx !== undefined && viewBox.cy !== undefined) {
									// Offset the total upward only if we have a label below it
									const totalY = totalLabel ? viewBox.cy - 8 : viewBox.cy;
									return (
										<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
											<tspan x={viewBox.cx} y={totalY} className="fill-foreground text-2xl font-bold">
												{total.toLocaleString()}
											</tspan>
											{totalLabel && (
												<tspan x={viewBox.cx} y={viewBox.cy + 12} className="fill-muted-foreground text-xs">
													{totalLabel}
												</tspan>
											)}
										</text>
									);
								}
							}}
						/>
					)}
				</Pie>
			</PieChart>
		</ChartContainer>
	);
}

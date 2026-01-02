"use client";

import { ChartContainer, type ChartConfig } from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

export interface SimpleRadialChartProps {
  /** Current value (0-100 for percentage, or any number with max) */
  value: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Label shown below the value */
  label?: string;
  /** Color for the radial bar */
  color?: string;
  /** Size of the chart container */
  size?: "sm" | "md" | "lg";
  /** Additional className for the container */
  className?: string;
  /** Format function for displaying the value */
  formatValue?: (value: number) => string;
  /** Start angle in degrees (default: 90 = top) */
  startAngle?: number;
  /** End angle in degrees */
  endAngle?: number;
}

const SIZE_CONFIG = {
  sm: {
    container: "max-h-[120px]",
    innerRadius: 50,
    outerRadius: 70,
    fontSize: "text-2xl",
  },
  md: {
    container: "max-h-[180px]",
    innerRadius: 70,
    outerRadius: 95,
    fontSize: "text-3xl",
  },
  lg: {
    container: "max-h-[220px]",
    innerRadius: 85,
    outerRadius: 115,
    fontSize: "text-4xl",
  },
};

export function SimpleRadialChart({
  value,
  max = 100,
  label,
  color = "var(--chart-1)",
  size = "md",
  className,
  formatValue = (v) => `${Math.round(v)}%`,
  startAngle = 90,
  endAngle,
}: SimpleRadialChartProps) {
  const sizeConfig = SIZE_CONFIG[size];

  // Calculate the end angle based on the percentage
  const percentage = Math.min(value / max, 1);
  const calculatedEndAngle = endAngle ?? startAngle + percentage * 360;

  const chartData = [{ value, fill: color }];

  const chartConfig: ChartConfig = {
    value: {
      label: label || "Value",
      color,
    },
  };

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-square w-full", sizeConfig.container, className)}
    >
      <RadialBarChart
        data={chartData}
        startAngle={startAngle}
        endAngle={calculatedEndAngle}
        innerRadius={sizeConfig.innerRadius}
        outerRadius={sizeConfig.outerRadius}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[sizeConfig.innerRadius + 8, sizeConfig.innerRadius - 6]}
        />
        <RadialBar dataKey="value" background cornerRadius={10} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                const totalY = label ? (viewBox.cy ?? 0) - 8 : viewBox.cy;
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={totalY}
                      className={cn(
                        "fill-foreground font-bold",
                        sizeConfig.fontSize,
                      )}
                    >
                      {formatValue(value)}
                    </tspan>
                    {label && (
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 16}
                        className="fill-muted-foreground text-xs"
                      >
                        {label}
                      </tspan>
                    )}
                  </text>
                );
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  );
}

"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@repo/ui/components/chart";
import { cn } from "@repo/ui/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

export interface BarChartDataItem {
  name: string;
  value: number;
  color: string;
  label?: string;
}

export interface SimpleBarChartProps {
  data: BarChartDataItem[];
  /** Layout direction */
  layout?: "horizontal" | "vertical";
  /** Size of the chart container */
  size?: "sm" | "md" | "lg";
  /** Show labels on bars */
  showLabels?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Data key for the value field */
  dataKey?: string;
  /** Name key for the label field */
  nameKey?: string;
  /** Bar radius */
  radius?: number;
  /** Empty state message */
  emptyMessage?: string;
}

const SIZE_CONFIG = {
  sm: { container: "h-[150px]", barSize: 16 },
  md: { container: "h-[200px]", barSize: 20 },
  lg: { container: "h-[300px]", barSize: 24 },
};

export function SimpleBarChart({
  data,
  layout = "vertical",
  size = "md",
  showLabels = true,
  showGrid = false,
  className,
  dataKey = "value",
  nameKey = "name",
  radius = 4,
  emptyMessage = "No data to display",
}: SimpleBarChartProps) {
  const sizeConfig = SIZE_CONFIG[size];

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground text-sm",
          sizeConfig.container,
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  // Build chart config from data
  const chartConfig: ChartConfig = {
    [dataKey]: { label: "Total" },
    label: { color: "var(--foreground)" },
    ...Object.fromEntries(
      data.map((item) => [
        item.name,
        {
          label: item.label || item.name,
          color: item.color,
        },
      ]),
    ),
  };

  // Transform data for recharts - use individual fill colors
  const chartData = data.map((item) => ({
    [nameKey]: item.label || item.name,
    [dataKey]: item.value,
    fill: item.color,
  }));

  if (layout === "vertical") {
    return (
      <ChartContainer
        config={chartConfig}
        className={cn("w-full", sizeConfig.container, className)}
      >
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ right: showLabels ? 40 : 16, left: 8 }}
        >
          {showGrid && <CartesianGrid horizontal={false} />}
          <YAxis
            dataKey={nameKey}
            type="category"
            tickLine={false}
            tickMargin={8}
            axisLine={false}
            hide
          />
          <XAxis dataKey={dataKey} type="number" hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent nameKey={nameKey} />}
          />
          <Bar
            dataKey={dataKey}
            layout="vertical"
            radius={radius}
            barSize={28}
            minPointSize={80}
          >
            <LabelList
              dataKey={nameKey}
              position="insideLeft"
              offset={8}
              fontSize={12}
              fill="var(--foreground)"
              content={({ x, y, width, height, value }) => {
                if (!showLabels || !value) return null;
                const barWidth = Number(width);
                const maxChars = Math.floor((barWidth - 16) / 7); // ~7px per char
                const displayValue = String(value);
                const truncated =
                  displayValue.length > maxChars && maxChars > 3
                    ? `${displayValue.slice(0, maxChars - 1)}…`
                    : displayValue;
                return (
                  <text
                    x={Number(x) + 8}
                    y={Number(y) + Number(height) / 2}
                    fill="var(--foreground)"
                    fontSize={12}
                    dominantBaseline="middle"
                  >
                    {truncated}
                  </text>
                );
              }}
            />
            <LabelList
              dataKey={dataKey}
              position="right"
              offset={8}
              fontSize={12}
              content={({ x, y, width, height, value }) => {
                if (!showLabels) return null;
                return (
                  <text
                    x={Number(x) + Number(width) + 8}
                    y={Number(y) + Number(height) / 2}
                    fontSize={12}
                    dominantBaseline="middle"
                    className="fill-foreground"
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  // Horizontal layout
  return (
    <ChartContainer
      config={chartConfig}
      className={cn("w-full", sizeConfig.container, className)}
    >
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20 }}>
        {showGrid && <CartesianGrid vertical={false} />}
        <XAxis
          dataKey={nameKey}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) =>
            value.length > 10 ? `${value.slice(0, 10)}...` : value
          }
        />
        <YAxis hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey={dataKey} radius={radius}>
          {showLabels && (
            <LabelList
              dataKey={dataKey}
              position="top"
              fill="var(--foreground)"
              fontSize={12}
            />
          )}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

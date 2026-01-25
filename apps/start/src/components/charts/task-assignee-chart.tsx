"use client";

import { cn } from "@/lib/utils";
import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { ChartContainer, type ChartConfig } from "@repo/ui/components/chart";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconUser } from "@tabler/icons-react";
import { useMemo, type ReactNode } from "react";
import { Cell, Pie, PieChart } from "recharts";

export interface TaskAssigneeChartProps {
  tasks: schema.TaskWithLabels[];
  /** Maximum number of assignees to show */
  maxItems?: number;
  /** Additional className */
  className?: string;
  /** Optional render prop to wrap each tile (e.g., with Link) */
  renderTileWrapper?: (assigneeId: string, children: ReactNode) => ReactNode;
}

const chartConfig = {
  completed: {
    label: "Completed",
    color: "var(--primary)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--secondary)",
  },
} satisfies ChartConfig;

function DonutChart({ percentage }: { percentage: number }) {
  // Single pie chart with two segments
  const chartData = [
    {
      name: "completed",
      value: percentage,
      fill: "var(--color-completed)",
    },
    {
      name: "remaining",
      value: 100 - percentage,
      fill: "var(--color-remaining)",
    },
  ];

  return (
    <ChartContainer
      config={chartConfig}
      className="w-8 h-8 shrink-0 aspect-square"
    >
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={10}
          outerRadius={14}
          startAngle={90}
          endAngle={-270}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

interface AssigneeData {
  id: string;
  name: string;
  image?: string | null;
  totalCount: number;
  completedCount: number;
}

export function TaskAssigneeChart({
  tasks,
  maxItems = 8,
  className,
  renderTileWrapper,
}: TaskAssigneeChartProps) {
  const assigneeData = useMemo(() => {
    const assigneeCounts = new Map<string, AssigneeData>();

    // Count tasks per assignee
    for (const task of tasks) {
      const isCompleted = task.status === "done" || task.status === "canceled";

      if (task.assignees && task.assignees.length > 0) {
        for (const assignee of task.assignees) {
          const existing = assigneeCounts.get(assignee.id);
          if (existing) {
            existing.totalCount++;
            if (isCompleted) {
              existing.completedCount++;
            }
          } else {
            assigneeCounts.set(assignee.id, {
              id: assignee.id,
              name: assignee.name || "Unknown",
              image: assignee.image,
              totalCount: 1,
              completedCount: isCompleted ? 1 : 0,
            });
          }
        }
      } else {
        const existing = assigneeCounts.get("unassigned");
        if (existing) {
          existing.totalCount++;
          if (isCompleted) {
            existing.completedCount++;
          }
        } else {
          assigneeCounts.set("unassigned", {
            id: "unassigned",
            name: "No assignee",
            image: null,
            totalCount: 1,
            completedCount: isCompleted ? 1 : 0,
          });
        }
      }
    }

    // Convert to array and sort by totalCount descending
    const sorted = Array.from(assigneeCounts.values()).sort((a, b) => {
      // Keep unassigned at the end
      if (a.id === "unassigned") return 1;
      if (b.id === "unassigned") return -1;
      return b.totalCount - a.totalCount;
    });

    return sorted.slice(0, maxItems);
  }, [tasks, maxItems]);

  if (assigneeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
        No tasks to display
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-1 w-full">
        {assigneeData.map((assignee) => {
          const percentage =
            assignee.totalCount > 0
              ? (assignee.completedCount / assignee.totalCount) * 100
              : 0;
          const initials = assignee.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          const tileContent = (
            <Tile
              key={assignee.id}
              className={cn(
                "bg-card md:w-full gap-3 p-1",
                renderTileWrapper && "cursor-pointer hover:bg-accent/50 transition-colors"
              )}
            >
              <TileHeader>
                <TileIcon className="bg-transparent">
                  {assignee.id === "unassigned" ? (
                    <div className="flex h-3 w-3 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                      <IconUser className="h-2 w-2" />
                    </div>
                  ) : (
                    <Avatar className="h-3 w-3">
                      <AvatarImage
                        src={assignee.image || undefined}
                        alt={assignee.name}
                      />
                      <AvatarFallback className="text-[8px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </TileIcon>
                <TileTitle className="flex items-center gap-2">
                  {assignee.name}
                </TileTitle>
              </TileHeader>
              <TileDescription className="ml-auto">
                <span className="text-xs text-muted-foreground font-normal">
                  {Math.round(percentage)}% of {assignee.totalCount}
                </span>
              </TileDescription>
              <TileAction>
                <DonutChart percentage={percentage} />
              </TileAction>
            </Tile>
          );

          return renderTileWrapper ? renderTileWrapper(assignee.id, tileContent) : tileContent;
        })}
      </div>
    </div>
  );
}

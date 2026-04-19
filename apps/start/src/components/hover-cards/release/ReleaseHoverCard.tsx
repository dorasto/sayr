import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import {
  IconCalendarCheck,
  IconCalendarEvent,
  IconRocket,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@repo/ui/components/chart";
import RenderIcon from "@/components/generic/RenderIcon";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { HoverCardBase, type HoverCardBaseProps } from "../HoverCardBase";
import {
  Tile,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { InlineLabel } from "@/components/tasks";

/**
 * Extracts plain text from a ProseMirror NodeJSON tree.
 * Used to render description previews without a full editor.
 */
function extractTextFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.content))
    return n.content.map(extractTextFromNode).join(" ");
  return "";
}

export interface ReleaseHoverCardProps extends Pick<
  HoverCardBaseProps,
  | "side"
  | "align"
  | "sideOffset"
  | "openDelay"
  | "closeDelay"
  | "disabled"
  | "forceClose"
> {
  release: schema.releaseType | undefined;
  /**
   * When provided, a task progress bar is shown.
   * Omit entirely to hide the progress section (e.g. in timeline events).
   */
  tasks?: schema.TaskWithLabels[];
  /** The element that triggers the hover card on mouse enter */
  children: React.ReactNode;
}

const donutChartConfig = {
  completed: { label: "Completed", color: "var(--primary)" },
  remaining: { label: "Remaining", color: "var(--secondary)" },
} satisfies ChartConfig;

function TaskDonutChart({ pct }: { pct: number }) {
  const data = [
    { name: "completed", value: pct, fill: "var(--color-completed)" },
    { name: "remaining", value: 100 - pct, fill: "var(--color-remaining)" },
  ];
  return (
    <ChartContainer
      config={donutChartConfig}
      className="w-5 h-5 shrink-0 aspect-square"
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={6}
          outerRadius={10}
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

/**
 * Hover card that previews release details.
 * Wrap any trigger element with this — clicking still works normally.
 *
 * @example Sidebar (with task progress)
 * ```tsx
 * <ReleaseHoverCard release={selectedRelease} tasks={releaseTasks} disabled={!selectedRelease}>
 *   <ComboBoxTrigger>...</ComboBoxTrigger>
 * </ReleaseHoverCard>
 * ```
 *
 * @example Timeline (no task progress needed)
 * ```tsx
 * <ReleaseHoverCard release={toRelease}>
 *   <Link to="..."><InlineLabel .../></Link>
 * </ReleaseHoverCard>
 * ```
 */
export function ReleaseHoverCard({
  release,
  tasks,
  children,
  disabled,
  forceClose,
  side = "bottom",
  align = "start",
  sideOffset,
  openDelay,
  closeDelay,
}: ReleaseHoverCardProps) {
  if (!release) {
    return <>{children}</>;
  }

  const statusConfig = getReleaseStatusConfig(release.status);

  // Task progress
  const totalTasks = tasks?.length ?? 0;
  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const progressPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  // Description as plain text
  const descText = release.description
    ? extractTextFromNode(release.description).trim()
    : "";

  // Which date to display
  const displayDate = release.releasedAt ?? release.targetDate;
  const isReleased = !!release.releasedAt;

  return (
    <HoverCardBase
      trigger={children}
      disabled={disabled}
      forceClose={forceClose}
      side={side}
      align={align}
      sideOffset={sideOffset}
      openDelay={openDelay}
      closeDelay={closeDelay}
      defaultOpen={true}
    >
      {/* Header */}
      <div className="flex items-start p-2 gap-2.5 border-b border-border hover:bg-accent">
        <Link
          to="/$orgId/releases/$releaseSlug"
          params={{ orgId: release.organizationId, releaseSlug: release.slug }}
          className="w-full"
        >
          <Tile className="p-0 md:w-full bg-transparent flex-col gap-2 items-start">
            <TileHeader className="w-full">
              <div className="flex items-center gap-1 w-full">
                <TileIcon>
                  {release.icon ? (
                    <RenderIcon
                      iconName={release.icon}
                      size={14}
                      color={release.color || undefined}
                      raw
                    />
                  ) : (
                    <div
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: release.color || "#cccccc" }}
                    />
                  )}
                </TileIcon>
                <div className="flex-1 flex items-center gap-1 justify-between">
                  <TileTitle className="line-clamp-1">{release.name}</TileTitle>
                  {release.slug && (
                    <Label
                      variant={"description"}
                      className="text-xs text-muted-foreground font-mono ml-auto text-right shrink-0"
                    >
                      {release.slug}
                    </Label>
                  )}
                </div>
              </div>
            </TileHeader>
          </Tile>
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5 p-2">
        {/* Description */}
        {descText && (
          <Label variant={"description"} className="line-clamp-2 text-xs">
            {descText}
          </Label>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <div className="flex flex-wrap gap-2 w-full">
          {/*status*/}
          {statusConfig && (
            <InlineLabel
              text={statusConfig.label}
              icon={statusConfig.icon("size-5")}
              className={cn(
                "ps-7 h-6 bg-accent rounded-2xl pe-3 border",
                statusConfig.badgeClassName,
              )}
            />
          )}
          {/* Date */}
          {displayDate && (
            <InlineLabel
              text={`${isReleased ? "Released" : "Target"} ${formatDate(displayDate)}`}
              icon={
                isReleased ? (
                  <IconCalendarCheck className="size-5" />
                ) : (
                  <IconCalendarEvent className="size-5" />
                )
              }
              className="ps-7 h-6 bg-accent rounded-2xl pe-3 border"
            />
          )}

          {tasks !== undefined && (
            <InlineLabel
              text={`${doneTasks} of ${totalTasks} tasks done`}
              icon={<TaskDonutChart pct={progressPct} />}
              className="ps-7 h-6 bg-accent rounded-2xl pe-3 border"
            />
          )}
        </div>
      </div>
    </HoverCardBase>
  );
}

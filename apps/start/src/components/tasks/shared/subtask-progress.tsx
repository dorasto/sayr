import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";

export interface SubtaskProgressBadgeProps {
  completed: number;
  total: number;
  /** Extra className merged onto the outer Badge. */
  className?: string;
}

/** Tiny inline SVG donut + "x/y" text for subtask progress. */
export function SubtaskProgressBadge({
  completed,
  total,
  className,
}: SubtaskProgressBadgeProps) {
  const size = 14;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? completed / total : 0;
  const dashLength = circumference * ratio;
  const allDone = completed === total;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 bg-muted text-xs h-5 border-transparent rounded-2xl cursor-default w-fit shrink-0 px-1.5 hover:bg-muted",
        className,
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/30"
        />
        {/* Progress arc */}
        {ratio > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={allDone ? "var(--color-success)" : "currentColor"}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeLinecap="round"
            className={allDone ? "" : "text-foreground"}
          />
        )}
      </svg>
      <span className={allDone ? "text-success" : "text-muted-foreground"}>
        {completed}/{total}
      </span>
    </Badge>
  );
}

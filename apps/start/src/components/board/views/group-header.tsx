import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ROW_LEADING_GUTTER_CLASS } from "../config/field-config";

interface GroupHeaderContentProps {
  label: string;
  icon?: ReactNode;
  count: number;
  /** Semantic theme-token tint (e.g. "bg-primary/5") for status/priority groups — see config/groupings.ts. */
  toneClassName?: string;
  /** Raw hex tint for category/release groups (user-picked colors, no theme-token equivalent). */
  color?: string;
  isDropTarget?: boolean;
  isSubGroup?: boolean;
  /** Omit to render without the expand/collapse chevron (e.g. a non-collapsible header). */
  expanded?: boolean;
}

/**
 * The tinted icon+label+count content of a group header — deliberately
 * split out from board-list-view.tsx's sticky/collapsible section wrapper
 * (which is list-specific dnd-kit + scroll behavior) so this same visual
 * language — a rounded pill tinted per status/priority/category/release —
 * is available to kanban column headers too, not locked to the list view.
 *
 * Chevron stays leading (left), matching the row's own future leading
 * checkbox slot (ROW_LEADING_GUTTER_CLASS, imported by board-row.tsx).
 * That's the one place header and row deliberately line up; trying to also line up
 * the header's group icon with a row's status icon (an earlier version of
 * this did, via invisible spacers mirroring the row's whole leading
 * structure) looked forced and was reverted.
 */
export function GroupHeaderContent({
  label,
  icon,
  count,
  toneClassName,
  color,
  isDropTarget = false,
  isSubGroup = false,
  expanded,
}: GroupHeaderContentProps) {
  return (
    <div
      style={color ? { backgroundColor: `${color}26` } : undefined}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1.5 text-left transition-[filter,background-color]",
        isDropTarget ? "bg-primary/15" : "hover:brightness-110",
        !isDropTarget && toneClassName,
        !isDropTarget &&
          !toneClassName &&
          !color &&
          (isSubGroup ? "bg-background" : undefined),
      )}
    >
      {expanded !== undefined && (
        <IconChevronDown
          className={cn(
            ROW_LEADING_GUTTER_CLASS,
            "h-3.5 text-muted-foreground transition-transform shrink-0",
            !expanded && "-rotate-90",
          )}
        />
      )}
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

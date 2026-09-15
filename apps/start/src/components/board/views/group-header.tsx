import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** The org-icon+key slot's width in board-row.tsx — imported there too, so this stays the single source of truth. */
export const ORG_KEY_SLOT_CLASS = "w-20";

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
 * When `icon` is set (status/priority grouping), two invisible spacers
 * mirror board-row.tsx's leading elements — the priority icon and the
 * org-icon+key slot — so this icon lands at the exact x-position of the
 * matching icon on the rows below it. Keep these widths in sync with
 * board-row.tsx if that layout changes (FieldPriority's icon is ~14px/w-3.5;
 * the org slot is ORG_KEY_SLOT_CLASS, w-20).
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
				!isDropTarget && !toneClassName && !color && (isSubGroup ? "bg-accent" : undefined)
			)}
		>
			{icon && (
				<>
					<div aria-hidden="true" className="w-3.5 shrink-0" />
					<div aria-hidden="true" className={cn(ORG_KEY_SLOT_CLASS, "shrink-0")} />
				</>
			)}
			{icon}
			<span className="text-xs font-medium">{label}</span>
			<span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
			<div className="flex-1" />
			{expanded !== undefined && (
				<IconChevronDown
					className={cn("size-3.5 text-muted-foreground transition-transform shrink-0", !expanded && "-rotate-90")}
				/>
			)}
		</div>
	);
}

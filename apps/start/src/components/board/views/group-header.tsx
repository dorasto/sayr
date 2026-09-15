import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";

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
			{expanded !== undefined && (
				<IconChevronDown
					className={cn("size-3.5 text-muted-foreground transition-transform", !expanded && "-rotate-90")}
				/>
			)}
			{icon}
			<span className="text-xs font-medium">{label}</span>
			<Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
				{count}
			</Badge>
		</div>
	);
}

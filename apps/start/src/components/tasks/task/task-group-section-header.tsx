"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { TaskGroup, TaskGroupingId } from "../filter/types";
import { Separator } from "@repo/ui/components/separator";
import { GROUP_HEADER_STYLES } from "../shared/config";

interface TaskGroupSectionHeaderProps {
	group: TaskGroup;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
	isSubGroup?: boolean;
	stickyTop?: string;
	isSticky?: boolean;
	className?: string;
	rootClassName?: string;
	compact?: boolean;
}

export function TaskGroupSectionHeader({
	group,
	isCollapsed,
	onToggleCollapse,
	isSubGroup = false,
	stickyTop,
	isSticky = false,
	className,
	rootClassName,
	compact = false,
}: TaskGroupSectionHeaderProps) {
	// Extract grouping type from group.id (format: "groupingType:key")
	const groupingType = group.id.split(":")[0] as TaskGroupingId | undefined;
	const headerStyle = groupingType ? GROUP_HEADER_STYLES[groupingType] : undefined;

	return (
		<div
			className={cn(
				"z-10 select-none group",
				isSubGroup ? "bg-accent z-9" : "bg-muted z-10",
				isSticky ? "sticky" : "",
				headerStyle?.rootClassName,
				rootClassName,
			)}
			style={{ top: stickyTop ?? (isSubGroup ? "44px" : "0px") }}
			onClick={onToggleCollapse}
		>
			<div
				className={cn(
					"flex items-center justify-between px-4 py-2 relative overflow-hidden shrink-0",
					compact && "px-2 py-1.5",
					headerStyle?.getItemClassName?.(group.key),
					className,
				)}
			>
        <div className="flex items-center gap-2 shrink-0 w-full">
          {!compact && (
            <Button variant="ghost" size="sm" className={cn("h-3 w-3 p-0")}>
              <IconChevronDown
                className={cn(
                  "h-3 w-3 transition-all duration-300",
                  isCollapsed && "-rotate-90",
                )}
              />
            </Button>
          )}

          <div className="flex items-center gap-2 w-full">
            {group.icon && (
              <span
                className={cn("text-sm font-medium", group.accentClassName)}
              >
                {group.icon}
              </span>
            )}
            <div
              className={cn(
                "flex min-w-0 flex-col leading-tight",
                compact && "w-full",
              )}
            >
              <p className={cn("text-sm font-medium", isSubGroup && "text-xs")}>
                {group.label}
              </p>
              {group.description && (
                <span className="text-xs text-muted-foreground truncate">
                  {group.description}
                </span>
              )}
            </div>
            <Badge
              variant={"outline"}
              className={cn(
                "rounded pointer-events-none border-transparent text-muted-foreground",
                isSubGroup && "text-xs",
                compact && "ml-auto",
              )}
            >
              {group.count}
            </Badge>
          </div>
        </div>

        {isSubGroup && (
          <div className="w-full shrink">
            <Separator className="bg-accent/20 group-hover:bg-transparent transition-all" />
          </div>
        )}
      </div>
    </div>
  );
}

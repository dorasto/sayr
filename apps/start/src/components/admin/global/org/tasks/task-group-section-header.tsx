"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { TaskGroup } from "./filter/types";

interface TaskGroupSectionHeaderProps {
	group: TaskGroup;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function TaskGroupSectionHeader({
	group,
	isCollapsed,
	onToggleCollapse,
}: TaskGroupSectionHeaderProps) {
	return (
		<div className={cn("sticky top-0 z-10 rounded select-none bg-muted")}>
			<div className="flex items-center justify-between px-4 py-2 relative">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggleCollapse}
						className="h-3 w-3 p-0"
					>
						<IconChevronDown
							className={cn(
								"h-3 w-3 transition-all duration-300",
								isCollapsed && "-rotate-90",
							)}
						/>
					</Button>

					<div className="flex items-center gap-2">
						{group.icon && (
							<span
								className={cn("text-sm font-medium", group.accentClassName)}
							>
								{group.icon}
							</span>
						)}
						<div className="flex min-w-0 flex-col leading-tight">
							<p className={cn("text-sm font-medium")}>{group.label}</p>
							{group.description && (
								<span className="text-xs text-muted-foreground truncate">
									{group.description}
								</span>
							)}
						</div>
						<Badge
							variant={"outline"}
							className="rounded pointer-events-none border-transparent text-muted-foreground"
						>
							{group.count}
						</Badge>
					</div>
				</div>
			</div>
		</div>
	);
}

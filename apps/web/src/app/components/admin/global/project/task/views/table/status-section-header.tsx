"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import StatusIcon from "@repo/ui/components/icons/status";
import { cn } from "@repo/ui/lib/utils";
import { IconChevronCompactDown, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { statusConfig } from "@/app/components/admin/global/project/shared/task-config";

interface StatusSectionHeaderProps {
	status: string;
	count: number;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export function StatusSectionHeader({ status, count, isCollapsed, onToggleCollapse }: StatusSectionHeaderProps) {
	const config = statusConfig[status as keyof typeof statusConfig];

	return (
		<div className={cn("sticky top-0 z-10 rounded select-none bg-muted")}>
			<div className="flex items-center justify-between px-4 py-2 relative">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={onToggleCollapse} className="h-3 w-3 p-0 ">
						<IconChevronDown className={cn("h-3 w-3 transition-all", isCollapsed && "-rotate-90")} />
					</Button>

					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">{config?.icon(`h-3.5 w-3.5 ${config?.className || ""}`)}</span>
						<p className="text-sm font-medium">{config?.label || status}</p>
						<Badge variant={"outline"} className="rounded pointer-events-none">
							{count}
						</Badge>
					</div>
				</div>
			</div>
		</div>
	);
}

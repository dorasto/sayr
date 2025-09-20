"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { ChevronDown, ChevronRight, Circle, Plus } from "lucide-react";

interface StatusSectionHeaderProps {
	status: string;
	count: number;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

const statusConfig = {
	backlog: {
		label: "Backlog",
		color: "",
		icon: Circle,
	},
	todo: {
		label: "Todo",
		color: "",
		icon: Circle,
	},
	"in-progress": {
		label: "In Progress",
		color: "",
		icon: Circle,
	},
	done: {
		label: "Done",
		color: "",
		icon: Circle,
	},
	canceled: {
		label: "Canceled",
		color: "",
		icon: Circle,
	},
};

export function StatusSectionHeader({ status, count, isCollapsed, onToggleCollapse }: StatusSectionHeaderProps) {
	const config = statusConfig[status as keyof typeof statusConfig];
	const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;
	const StatusIcon = config?.icon || Circle;

	return (
		<div className={`sticky top-0 z-10 bg-muted rounded select-none`}>
			<div className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggleCollapse}
						className="h-3 w-3 p-0 hover:bg-black/5 dark:hover:bg-white/5"
					>
						<ChevronIcon className="h-3 w-3" />
					</Button>

					<div className="flex items-center gap-2 pl-9">
						<span className="text-sm font-medium">
							{" "}
							<StatusIcon className={`h-4 w-4 ${status || ""}`} />
						</span>
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

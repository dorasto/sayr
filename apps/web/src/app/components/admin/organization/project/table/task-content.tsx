"use client";

import { Badge } from "@repo/ui/components/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import type { TaskType } from "../list";
import { priorityConfig, statusConfig } from "./task-list-item";

interface TaskContentProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	task: TaskType;
}
export function TaskContent({ open, onOpenChange, task }: TaskContentProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="h-[90dvh] max-w-[calc(var(--container-7xl)-3rem)] flex flex-col gap-3 w-[calc(100vw-3rem)] overflow-auto p-6 pt-0"
				showClose={false}
			>
				<DialogHeader className="sticky top-0 bg-popover p-3">
					<DialogTitle asChild>
						<div className="flex items-center w-fit gap-1">
							<Label variant={"heading"} className={cn("text-left text-xl")}>
								{task.title}
							</Label>
							<Badge
								variant={"outline"}
								className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
							>
								{status?.icon(`${status?.className || ""}`)}
								{status.label}
							</Badge>
						</div>
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3 px-3"></div>
			</DialogContent>
		</Dialog>
	);
}

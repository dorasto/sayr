"use client";

import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
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
		<SplitDialog
			isOpen={open}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center w-fit gap-4">
					<Label variant={"heading"} className={cn("text-left text-xl")}>
						{task.title}
					</Label>
					<Badge
						variant={"outline"}
						className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1 ml-auto"
					>
						{status?.icon(`${status?.className || ""}`)}
						{status.label}
					</Badge>
				</div>
			}
			sidebarPosition="right"
		>
			<SplitDialogContent>
				<div className="flex flex-col gap-3">
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
				</div>
			</SplitDialogContent>
			<SplitDialogSide>
				<div className="flex flex-col gap-3">
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
					<h1>{task.title}</h1>
				</div>
			</SplitDialogSide>
		</SplitDialog>
	);
}

"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { DialogClose } from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconX } from "@tabler/icons-react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
import GlobalTaskCreatedAt from "@/app/components/globals/tasks/created";
import GlobalTaskLabels from "@/app/components/globals/tasks/label";
import GlobalTaskPriority from "@/app/components/globals/tasks/priority";
import GlobalTaskStatus from "@/app/components/globals/tasks/status";
import GlobalTimeline from "@/app/components/globals/tasks/timeline";
import { updateTaskAction } from "@/app/lib/fetches";
import { priorityConfig, statusConfig } from "./task-list-item";

interface TaskContentProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	task: schema.TaskWithLabels;
}
export function TaskContent({ open, onOpenChange, task }: TaskContentProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
	return (
		<SplitDialog
			isOpen={open}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center w-full gap-4">
					<Label variant={"heading"} className={cn("text-left text-lg truncate")}>
						{task.title}
					</Label>
					<Label variant={"heading"} className={cn("text-left text-lg text-muted-foreground shrink-0")}>
						#{task.shortId}
					</Label>
					<div className="ml-auto flex items-center gap-2 shrink-0">
						<Badge
							variant={"outline"}
							className="flex items-center flex-shrink-0 [&_svg]:size-5 gap-1 justify-start pl-1"
						>
							{status?.icon(`${status?.className || ""}`)}
							{status.label}
						</Badge>
						<Button size={"icon"} variant={"ghost"} onClick={() => onOpenChange(false)}>
							<IconX />
						</Button>
					</div>
				</div>
			}
			sidebarPosition="right"
		>
			<SplitDialogContent>
				<GlobalTimeline task={task} />
				{/* <div className="flex flex-col gap-3">
					<div className="flex items-start gap-2">
						<Avatar className="h-10 w-10 rounded-full bg-primary">
							<AvatarImage src={"/"} alt={""} />
							<AvatarFallback className="rounded-full bg-transparent uppercase">{"AA"}</AvatarFallback>
						</Avatar>
						<div className="border w-full rounded p-3">
							<Editor readonly={true} value={task.description as PartialBlock[]} />
						</div>
					</div>
					<Label variant={"heading"}>Activity</Label>
					
				</div> */}
			</SplitDialogContent>
			<SplitDialogSide>
				<div className="flex flex-col gap-3">
					<GlobalTaskCreatedAt task={task} />
					<Separator />
					<GlobalTaskStatus task={task} editable={true} />
					<GlobalTaskLabels task={task} editable={true} />
					<GlobalTaskPriority
						task={task}
						editable={true}
						onPriorityChange={async (value) => {
							await updateTaskAction(
								task.organizationId,
								task.projectId,
								task.id,
								{
									priority: value,
								},
								""
							);
						}}
					/>
				</div>
			</SplitDialogSide>
		</SplitDialog>
	);
}

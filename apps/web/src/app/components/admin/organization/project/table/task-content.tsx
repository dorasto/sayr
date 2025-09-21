"use client";

import type { PartialBlock } from "@blocknote/core";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { DialogClose } from "@repo/ui/components/dialog";
import { Label } from "@repo/ui/components/label";
import { SplitDialog, SplitDialogContent, SplitDialogSide } from "@repo/ui/components/tomui/split-dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconX } from "@tabler/icons-react";
import { Editor } from "@/app/components/blocknote/DynamicEditor";
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
						{task.id}
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
				<div className="flex flex-col gap-3">
					<Editor readonly={true} value={task.description as PartialBlock[]} />
				</div>
			</SplitDialogContent>
			<SplitDialogSide>
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-3">
						<Label variant={"subheading"}>Labels</Label>
						{task.labels && task.labels.length > 0 && (
							<div className="flex gap-1">
								{task.labels.map((label) => (
									<Badge
										key={label.id}
										variant="outline"
										className="flex overflow-hidden justify-center h-full flex-shrink-0 items-center rounded px-2.5 text-xs cursor-pointer"
										onClick={(e) => {
											e.stopPropagation();
											// Add label click logic here
										}}
									>
										<div className="flex items-center gap-1.5 overflow-hidden">
											<span
												className="h-2 w-2 flex-shrink-0 rounded-full"
												style={{ backgroundColor: label.color || "#cccccc" }}
											/>
											<div className="line-clamp-1 inline-block w-auto max-w-[120px] truncate">
												{label.name}
											</div>
										</div>
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>
			</SplitDialogSide>
		</SplitDialog>
	);
}

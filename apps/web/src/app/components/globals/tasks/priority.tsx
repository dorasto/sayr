"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { priorityConfig } from "../../admin/organization/project/table/task-list-item";
import { schema } from "@repo/database";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTaskPriority({ task }: GlobalTaskPriorityProps) {
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Priority</Label>
			<Button
				variant="accent"
				size={"sm"}
				className="flex justify-start"
				onClick={(e) => {
					e.stopPropagation();
					// Add priority change logic here
				}}
			>
				{priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
				<span>{priority?.label}</span>
			</Button>
		</div>
	);
}

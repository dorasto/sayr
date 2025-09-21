"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { type ComboBoxItem, ComboBoxResponsive } from "@repo/ui/components/tomui/combo-box-responsive";
import { priorityConfig } from "../../admin/organization/project/table/task-list-item";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onPriorityChange?: (priority: string) => void;
}

export default function GlobalTaskPriority({ task, editable = false, onPriorityChange }: GlobalTaskPriorityProps) {
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

	// Convert priority config to combo box items
	const priorityItems: ComboBoxItem[] = Object.entries(priorityConfig).map(([key, config]) => ({
		value: key,
		label: config.label,
		icon: config.icon("h-3.5 w-3.5"),
	}));

	const handlePriorityChange = (value: string | null) => {
		if (value && onPriorityChange) {
			onPriorityChange(value);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Priority</Label>
			<ComboBoxResponsive
				items={priorityItems}
				value={task.priority || undefined}
				onValueChange={handlePriorityChange}
				placeholder="Search priorities..."
				emptyText="No priorities found."
				buttonText="Select priority"
				buttonWidth="justify-start"
				popoverWidth="w-[180px]"
				disabled={editable === false}
			/>
		</div>
	);
}

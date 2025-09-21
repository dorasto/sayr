"use client";

import type { schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { priorityConfig } from "../../admin/organization/project/table/task-list-item";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onPriorityChange?: (priority: string) => void;
}

export default function GlobalTaskPriority({ task, editable = false, onPriorityChange }: GlobalTaskPriorityProps) {
	const currentPriority = task.priority || undefined;

	const handlePriorityChange = (value: string | null) => {
		if (value && onPriorityChange) {
			onPriorityChange(value);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Priority</Label>
			<div className="flex flex-col gap-2">
				<ComboBox value={currentPriority} onValueChange={handlePriorityChange}>
					<ComboBoxTrigger disabled={!editable} className="">
						<ComboBoxValue placeholder="Priority">
							{currentPriority && (
								<div className="flex items-center gap-2">
									{priorityConfig[currentPriority as keyof typeof priorityConfig]?.icon("h-4 w-4")}
									<span>{priorityConfig[currentPriority as keyof typeof priorityConfig]?.label}</span>
								</div>
							)}
						</ComboBoxValue>
						<ComboBoxIcon />
					</ComboBoxTrigger>
					<ComboBoxContent className="">
						<ComboBoxList>
							<ComboBoxSearch icon placeholder="Update priority to..." />
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{Object.entries(priorityConfig).map(([key, config]) => (
									<ComboBoxItem key={key} value={key}>
										{config.icon("h-4 w-4")}
										<span className="ml-2">{config.label}</span>
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
			</div>
		</div>
	);
}

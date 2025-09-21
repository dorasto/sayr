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
import { cn } from "@repo/ui/lib/utils";
import { statusConfig } from "../../admin/organization/project/table/task-list-item";

interface GlobalTaskStatusProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (status: string) => void;
}

export default function GlobalTaskStatus({ task, editable = false, onChange }: GlobalTaskStatusProps) {
	const currentStatus = task.status || undefined;

	const handleStatusChange = (value: string | null) => {
		if (value && onChange) {
			onChange(value);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<Label variant={"subheading"}>Status</Label>
			<div className="flex flex-col gap-2">
				<ComboBox value={currentStatus} onValueChange={handleStatusChange}>
					<ComboBoxTrigger disabled={!editable} className="">
						<ComboBoxValue placeholder="Status">
							{currentStatus && (
								<div className="flex items-center gap-2">
									{statusConfig[currentStatus as keyof typeof statusConfig]?.icon(
										cn(statusConfig[currentStatus as keyof typeof statusConfig]?.className, "h-4 w-4")
									)}
									<span>{statusConfig[currentStatus as keyof typeof statusConfig]?.label}</span>
								</div>
							)}
						</ComboBoxValue>
						<ComboBoxIcon />
					</ComboBoxTrigger>
					<ComboBoxContent className="">
						<ComboBoxList>
							<ComboBoxSearch icon placeholder="Update status to..." />
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{Object.entries(statusConfig).map(([key, config]) => (
									<ComboBoxItem key={key} value={key}>
										{config?.icon(cn(config?.className, "h-4 w-4"))}

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

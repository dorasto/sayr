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
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { getPriorityOptions, getPriorityDisplay, getPriorityUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (priority: string) => void;
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
	/** Compact mode shows only the icon without text label */
	compact?: boolean;
}

export default function GlobalTaskPriority({
	task,
	editable = false,
	onChange,
	tasks = [],
	setTasks,
	setSelectedTask,
	open,
	setOpen,
	customTrigger,
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskPriorityProps) {
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const currentPriority = (task.priority ?? "none") || "none";

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => { }),
		setTasks ?? (() => { }),
		sseClientId,
	);

	const handlePriorityChange = (value: string | null) => {
		if (!value) return;
		onChange?.(value);
		execute(getPriorityUpdatePayload(task, value));
	};

	const options = getPriorityOptions();
	const display = getPriorityDisplay(task);

	return customTrigger ? (
		<ComboBox value={currentPriority} onValueChange={handlePriorityChange} open={open} onOpenChange={setOpen}>
			<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch icon placeholder="Update priority to..." />
				<ComboBoxList>
					<ComboBoxEmpty>Not found</ComboBoxEmpty>
					<ComboBoxGroup>
						{options.map((opt) => (
							<ComboBoxItem key={opt.id} value={opt.id}>
								{opt.icon}
								<span className="ml-2">{opt.label}</span>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	) : (
		<div className="flex flex-col gap-3">
			{showLabel && <Label variant={"subheading"}>Priority</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={currentPriority} onValueChange={handlePriorityChange} open={open} onOpenChange={setOpen}>
					<ComboBoxTrigger disabled={!editable} className={className}>
						<ComboBoxValue placeholder="Priority">
							<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
								{display.icon}
								{!compact && <span className="truncate">{display.label}</span>}
							</div>
						</ComboBoxValue>
						{showChevron && <ComboBoxIcon />}
					</ComboBoxTrigger>
					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Update priority to..." />
						<ComboBoxList>
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{options.map((opt) => (
									<ComboBoxItem key={opt.id} value={opt.id}>
										{opt.icon}
										<span className="ml-2">{opt.label}</span>
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

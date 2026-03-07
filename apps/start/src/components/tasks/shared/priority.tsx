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
import { getPriorityUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";
import { priorityConfig } from "./config";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (priority: string) => void;
	// Props for internal logic (delegated to the unified action system)
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	/** @deprecated No longer needed — internal logic is now handled by the action system */
	onPriorityChange?: (priority: string) => void;
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
	useInternalLogic = false,
	open,
	setOpen,
	customTrigger,
	onPriorityChange: _onPriorityChange, // Legacy prop — ignored, kept for backward-compatible call sites
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskPriorityProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const currentPriority = (task.priority ?? "none") || "none";

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handlePriorityChange = async (value: string | null) => {
		if (!value) return;

		// Always call onChange first if provided (for external side effects like preventClick)
		if (onChange) {
			onChange(value);
		}

		if (useInternalLogic && setTasks && setSelectedTask) {
			execute(getPriorityUpdatePayload(task, value));
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && showLabel && <Label variant={"subheading"}>Priority</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={currentPriority} onValueChange={handlePriorityChange} open={open} onOpenChange={setOpen}>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className={className}>
							<ComboBoxValue placeholder="Priority">
								{currentPriority && (
									<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
										{priorityConfig[currentPriority as keyof typeof priorityConfig]?.icon(
											cn(
												priorityConfig[currentPriority as keyof typeof priorityConfig]?.className,
												"h-4 w-4"
											)
										)}
										{!compact && (
											<span className="truncate">
												{priorityConfig[currentPriority as keyof typeof priorityConfig]?.label}
											</span>
										)}
									</div>
								)}
							</ComboBoxValue>
							{showChevron && <ComboBoxIcon />}
						</ComboBoxTrigger>
					)}
					<ComboBoxContent className="">
						<ComboBoxSearch icon placeholder="Update priority to..." />
						<ComboBoxList>
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{Object.entries(priorityConfig).map(([key, config]) => (
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

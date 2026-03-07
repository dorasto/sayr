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
import { getStatusUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";
import { statusConfig } from "./config";

interface GlobalTaskStatusProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (status: string) => void;
	// Props for internal logic (delegated to the unified action system)
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
	/** Compact mode shows only the icon without text label */
	compact?: boolean;
}

export default function GlobalTaskStatus({
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
	showLabel = true,
	showChevron = true,
	className,
	compact = false,
}: GlobalTaskStatusProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const currentStatus = (task.status ?? "backlog") || "backlog";

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handleStatusChange = async (value: string | null) => {
		if (!value) return;

		// Always call onChange first if provided (for external side effects like ignoreNextClick)
		if (onChange) {
			onChange(value);
		}

		if (useInternalLogic && setTasks && setSelectedTask) {
			execute(getStatusUpdatePayload(task, value));
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && showLabel && <Label variant={"subheading"}>Status</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={currentStatus} onValueChange={handleStatusChange} open={open} onOpenChange={setOpen}>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className={className}>
							<ComboBoxValue placeholder="Status">
								{currentStatus && (
									<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
										{statusConfig[currentStatus as keyof typeof statusConfig]?.icon(
											cn(statusConfig[currentStatus as keyof typeof statusConfig]?.className, "h-4 w-4")
										)}
									{!compact && (
										<span className="truncate">
											{statusConfig[currentStatus as keyof typeof statusConfig]?.label}
										</span>
									)}
									</div>
								)}
							</ComboBoxValue>
							{showChevron && <ComboBoxIcon />}
						</ComboBoxTrigger>
					)}
					<ComboBoxContent className="">
						<ComboBoxSearch icon placeholder="Update status to..." />
						<ComboBoxList>
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

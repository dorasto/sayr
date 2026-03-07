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
import { getStatusOptions, getStatusDisplay, getStatusUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";

interface GlobalTaskStatusProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (status: string) => void;
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

export default function GlobalTaskStatus({
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
}: GlobalTaskStatusProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handleStatusChange = (value: string | null) => {
		if (!value) return;
		onChange?.(value);
		execute(getStatusUpdatePayload(task, value));
	};

	const options = getStatusOptions();
	const display = getStatusDisplay(task);

	return customTrigger ? (
		<ComboBox value={task.status ?? "backlog"} onValueChange={handleStatusChange} open={open} onOpenChange={setOpen}>
			<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch icon placeholder="Update status to..." />
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
			{showLabel && <Label variant={"subheading"}>Status</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={task.status ?? "backlog"} onValueChange={handleStatusChange} open={open} onOpenChange={setOpen}>
					<ComboBoxTrigger disabled={!editable} className={className}>
						<ComboBoxValue placeholder="Status">
							<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
								{display.icon}
								{!compact && <span className="truncate">{display.label}</span>}
							</div>
						</ComboBoxValue>
						{showChevron && <ComboBoxIcon />}
					</ComboBoxTrigger>
					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Update status to..." />
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

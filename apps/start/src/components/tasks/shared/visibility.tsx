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
import { getVisibilityOptions, getVisibilityDisplay, getVisibilityUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";

interface GlobalTaskVisibilityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (visibility: "public" | "private") => void;
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

export default function GlobalTaskVisibility({
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
}: GlobalTaskVisibilityProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	const handleVisibilityChange = (value: string | null) => {
		if (!value || (value !== "public" && value !== "private")) return;
		onChange?.(value as "public" | "private");
		execute(getVisibilityUpdatePayload(task, value));
	};

	const options = getVisibilityOptions();
	const display = getVisibilityDisplay(task);

	return customTrigger ? (
		<ComboBox value={task.visible ?? "public"} onValueChange={handleVisibilityChange} open={open} onOpenChange={setOpen}>
			<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch icon placeholder="Change visibility..." />
				<ComboBoxList>
					<ComboBoxEmpty>Not found</ComboBoxEmpty>
					<ComboBoxGroup>
						{options.map((opt) => (
							<ComboBoxItem key={opt.id} value={opt.id}>
								{opt.icon}
								<div className="ml-2 flex flex-col">
									<span>{opt.label}</span>
									{opt.description && (
										<span className="text-xs text-muted-foreground">{opt.description}</span>
									)}
								</div>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	) : (
		<div className="flex flex-col gap-3">
			{showLabel && <Label variant={"subheading"}>Visibility</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox value={task.visible ?? "public"} onValueChange={handleVisibilityChange} open={open} onOpenChange={setOpen}>
					<ComboBoxTrigger disabled={!editable} className={className}>
						<ComboBoxValue placeholder="Visibility">
							<div className={cn("flex items-center gap-2", compact && "max-w-20 text-xs")}>
								{display.icon}
								{!compact && <span className="truncate">{display.label}</span>}
							</div>
						</ComboBoxValue>
						{showChevron && <ComboBoxIcon />}
					</ComboBoxTrigger>
					<ComboBoxContent>
						<ComboBoxSearch icon placeholder="Change visibility..." />
						<ComboBoxList>
							<ComboBoxEmpty>Not found</ComboBoxEmpty>
							<ComboBoxGroup>
								{options.map((opt) => (
									<ComboBoxItem key={opt.id} value={opt.id}>
										{opt.icon}
										<div className="ml-2 flex flex-col">
											<span>{opt.label}</span>
											{opt.description && (
												<span className="text-xs text-muted-foreground">{opt.description}</span>
											)}
										</div>
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

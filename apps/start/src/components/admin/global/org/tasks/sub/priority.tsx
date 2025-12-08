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
import { updateTaskAction } from "@/app/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import { priorityConfig } from "../config";

interface GlobalTaskPriorityProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (priority: string) => void;
	// New props for internal logic
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	// If you want to use custom logic instead of internal logic, use onChange
	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
	// Legacy prop for backward compatibility
	onPriorityChange?: (priority: string) => void;
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
	onPriorityChange, // Legacy prop support
}: GlobalTaskPriorityProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast } = useToastAction();
	const currentPriority = (task.priority ?? "none") || "none";

	const handlePriorityChange = async (value: string | null) => {
		if (!value) return;

		// Always call onChange first if provided (for external side effects like preventClick)
		if (onChange) {
			onChange(value);
		}

		// Support legacy prop
		if (onPriorityChange) {
			onPriorityChange(value);
		}

		if (useInternalLogic && tasks && setTasks && setSelectedTask) {
			// Internal logic - same pattern as status
			const updatedTasks = tasks.map((t) =>
				t.id === task.id
					? { ...task, priority: value as schema.TaskWithLabels["priority"] }
					: t,
			);
			setTasks(updatedTasks);
			if (task) {
				setSelectedTask({
					...task,
					priority: value as schema.TaskWithLabels["priority"],
				});
			}

			const data = await runWithToast(
				"update-task-priority",
				{
					loading: {
						title: "Updating task...",
						description: "Updating your task... changes are already visible.",
					},
					success: {
						title: "Task saved",
						description: "Your changes have been saved successfully.",
					},
					error: {
						title: "Save failed",
						description:
							"Your changes are showing, but we couldn't save them to the server. Please try again.",
					},
				},
				() =>
					updateTaskAction(
						task.organizationId,
						task.id,
						{ priority: value },
						wsClientId,
					),
			);

			if (data?.success && data.data) {
				const finalTasks = tasks.map((t) =>
					t.id === task.id && data.data ? data.data : t,
				);
				setTasks(finalTasks);
				if (task && task.id === data.data.id) {
					setSelectedTask(data.data);
				}
			}
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && <Label variant={"subheading"}>Priority</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox
					value={currentPriority}
					onValueChange={handlePriorityChange}
					open={open}
					onOpenChange={setOpen}
				>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className="">
							<ComboBoxValue placeholder="Priority">
								{currentPriority && (
									<div className="flex items-center gap-2">
										{priorityConfig[
											currentPriority as keyof typeof priorityConfig
										]?.icon(
											cn(
												priorityConfig[
													currentPriority as keyof typeof priorityConfig
												]?.className,
												"h-4 w-4",
											),
										)}
										<span>
											{
												priorityConfig[
													currentPriority as keyof typeof priorityConfig
												]?.label
											}
										</span>
									</div>
								)}
							</ComboBoxValue>
							<ComboBoxIcon />
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

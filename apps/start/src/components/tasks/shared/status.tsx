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
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { updateTaskAction } from "@/app/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import { statusConfig } from "./config";

interface GlobalTaskStatusProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	onChange?: (status: string) => void;
	// New props for internal logic
	tasks?: schema.TaskWithLabels[];
	setTasks?: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask?: (newValue: schema.TaskWithLabels | null) => void;
	// If you want to use custom logic instead of internal logic, use onChange
	useInternalLogic?: boolean;
	open?: boolean;
	setOpen?: (open: boolean) => void;
	customTrigger?: React.ReactNode;
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
}: GlobalTaskStatusProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast } = useToastAction();
	const currentStatus = (task.status ?? "backlog") || "backlog";

	const handleStatusChange = async (value: string | null) => {
		if (!value) return;

		// Always call onChange first if provided (for external side effects like ignoreNextClick)
		if (onChange) {
			onChange(value);
		}

		if (useInternalLogic && tasks && setTasks && setSelectedTask) {
			// Internal logic - same as what was in TaskContentSideContent
			const updatedTasks = tasks.map((t) =>
				t.id === task.id
					? { ...task, status: value as schema.TaskWithLabels["status"] }
					: t,
			);
			setTasks(updatedTasks);
			if (task) {
				setSelectedTask({
					...task,
					status: value as schema.TaskWithLabels["status"],
				});
			}

			const data = await runWithToast(
				"update-task-status",
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
						{ status: value },
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
					sendWindowMessage(
						window,
						{
							type: "timeline-update",
							payload: data.data.id,
						},
						"*",
					);
				}
			}
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && <Label variant={"subheading"}>Status</Label>}
			<div className="flex flex-col gap-2">
				<ComboBox
					value={currentStatus}
					onValueChange={handleStatusChange}
					open={open}
					onOpenChange={setOpen}
				>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger disabled={!editable} className="">
							<ComboBoxValue placeholder="Status">
								{currentStatus && (
									<div className="flex items-center gap-2">
										{statusConfig[
											currentStatus as keyof typeof statusConfig
										]?.icon(
											cn(
												statusConfig[currentStatus as keyof typeof statusConfig]
													?.className,
												"h-4 w-4",
											),
										)}
										<span>
											{
												statusConfig[currentStatus as keyof typeof statusConfig]
													?.label
											}
										</span>
									</div>
								)}
							</ComboBoxValue>
							<ComboBoxIcon />
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

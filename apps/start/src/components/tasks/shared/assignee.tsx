"use client";

import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
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
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { XIcon } from "lucide-react";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";
import { updateAssigneesToTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";

interface GlobalTaskAssigneesProps {
	task: schema.TaskWithLabels;
	editable?: boolean;
	availableUsers?: schema.userType[];
	onChange?: (userIds: string[]) => void;
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
	onAssigneesChange?: (userIds: string[]) => void;
	align?: "start" | "center" | "end";
	side?: "top" | "right" | "bottom" | "left";
	showLabel?: boolean;
	showChevron?: boolean;
	className?: string;
}

export default function GlobalTaskAssignees({
	task,
	editable = false,
	availableUsers = [],
	onChange,
	tasks = [],
	setTasks,
	setSelectedTask,
	useInternalLogic = false,
	open,
	setOpen,
	customTrigger,
	onAssigneesChange, // Legacy prop support
	side,
	align,
	showLabel = true,
	showChevron = true,
	className,
}: GlobalTaskAssigneesProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const debouncedUpdate = useDebounceAsync(
		async (values: string[], wsClientId: string) => {
			const data = await runWithToast(
				"update-task-assignees",
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
					updateAssigneesToTaskAction(
						task.organizationId,
						task.id,
						values,
						wsClientId,
					),
			);
			return data;
		},
		1500, // debounce delay
	);
	const { runWithToast } = useToastAction();

	// Get current selected assignee IDs
	const currentAssigneeIds =
		task.assignees?.map((assignee) => assignee.id) || [];

	const handleAssigneesChange = async (values: string[]) => {
		// Always call onChange first if provided (for external side effects like preventClick)
		if (onChange) {
			onChange(values);
		}

		// Support legacy prop
		if (onAssigneesChange) {
			onAssigneesChange(values);
		}

		if (useInternalLogic && tasks && setTasks && setSelectedTask) {
			// Internal logic - same pattern as status and priority
			const updatedTasks = tasks.map((t) =>
				t.id === task.id
					? {
							...task,
							assignees: availableUsers.filter((user) =>
								values.includes(user.id),
							),
						}
					: t,
			);
			setTasks(updatedTasks);
			if (task) {
				setSelectedTask({
					...task,
					assignees: availableUsers.filter((user) => values.includes(user.id)),
				});
			}

			const data = await debouncedUpdate(values, wsClientId);

			if (data?.success && data.data && !data.skipped) {
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
			{!customTrigger && showLabel && (
				<Label variant={"subheading"}>Assigned</Label>
			)}
			<div className="flex flex-col gap-2">
				{!customTrigger &&
					task.assignees.map((assignee) => (
						<RenderAssignee
							key={assignee.id}
							assignee={assignee as schema.userType}
							showRemove={editable}
							onRemove={(assigneeId) => {
								handleAssigneesChange(
									currentAssigneeIds.filter((id) => id !== assigneeId),
								);
							}}
						/>
					))}
				<ComboBox
					values={currentAssigneeIds}
					onValuesChange={handleAssigneesChange}
					open={open}
					onOpenChange={setOpen}
				>
					{customTrigger ? (
						// Wrap customTrigger in ComboBoxTrigger asChild so it opens the ComboBox
						<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
					) : currentAssigneeIds.length === 0 ? (
						<ComboBoxTrigger disabled={!editable} className={className}>
							<ComboBoxValue placeholder="Status">
								<div className="flex items-center gap-2 text-muted-foreground">
									<IconUserPlus className="h-4 w-4" />
									<span>Unassigned</span>
								</div>
							</ComboBoxValue>
							{showChevron && <ComboBoxIcon />}
						</ComboBoxTrigger>
					) : (
						<ComboBoxTrigger
							disabled={!editable}
							className="h-6 w-6 aspect-square p-0 justify-center"
						>
							<IconPlus size={14} />
						</ComboBoxTrigger>
					)}

					<ComboBoxContent className="" align={align} side={side}>
						<ComboBoxSearch placeholder="Assign to..." />
						<ComboBoxList>
							<ComboBoxEmpty>No users found.</ComboBoxEmpty>
							<ComboBoxGroup>
								{availableUsers.map((user) => (
									<ComboBoxItem
										key={user.id}
										value={user.id}
										searchValue={user.name.toLowerCase()}
									>
										<Avatar className="h-6 w-6">
											<AvatarImage
												src={user.image || undefined}
												alt={user.name}
											/>
											<AvatarFallback className="text-xs">
												{user.name
													.split(" ")
													.map((n: string) => n[0])
													.join("")
													.toUpperCase()
													.slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col">
											<span className="text-sm font-medium">{user.name}</span>
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

interface RenderAssigneeProps {
	assignee: schema.userType;
	showRemove?: boolean;
	onRemove?: (assigneeId: string) => void;
	onClick?: (e: React.MouseEvent, assigneeId: string) => void;
	className?: string;
}

export function RenderAssignee({
	assignee,
	showRemove = false,
	onRemove,
	onClick,
	className = "",
}: RenderAssigneeProps) {
	return (
		<Button
			key={assignee.id}
			variant="accent"
			className={cn(
				"justify-start group/assignee relative h-auto py-1 bg-transparent border-transparent px-1",
				showRemove && "pr-6",
				className,
			)}
			onClick={onClick ? (e) => onClick(e, assignee.id) : undefined}
		>
			<Avatar className="h-6 w-6">
				<AvatarImage src={assignee.image || undefined} alt={assignee.name} />
				<AvatarFallback className="text-xs">
					{assignee.name
						.split(" ")
						.map((n) => n[0])
						.join("")
						.toUpperCase()
						.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<span className="truncate">{assignee.name}</span>
			{showRemove && onRemove && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pr-1">
					<XIcon
						size={12}
						className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/assignee:opacity-100"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(assignee.id);
						}}
					/>
				</div>
			)}
		</Button>
	);
}

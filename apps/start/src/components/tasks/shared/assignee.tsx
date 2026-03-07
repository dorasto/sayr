"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
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
import { cn } from "@repo/ui/lib/utils";
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { XIcon } from "lucide-react";
import { getAssigneeBulkUpdatePayload, useTaskFieldAction } from "@/components/tasks/actions";
import { useDebounceAsync } from "@/hooks/useDebounceAsync";

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
	/** Compact mode shows stacked avatars without names */
	compact?: boolean;
	/** Maximum avatars to show in compact mode before showing +N (default: 3) */
	maxCompactAvatars?: number;
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
	compact = false,
	maxCompactAvatars = 3,
}: GlobalTaskAssigneesProps) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	const { execute } = useTaskFieldAction(
		task,
		tasks,
		setSelectedTask ?? (() => {}),
		setTasks ?? (() => {}),
		wsClientId,
	);

	// Debounce only the API call + reconciliation; optimistic updates happen immediately.
	const debouncedExecute = useDebounceAsync(
		async (values: string[]) => {
			const payload = getAssigneeBulkUpdatePayload(task, values, availableUsers, wsClientId);
			await execute(payload, { skipOptimistic: true });
		},
		1500,
	);

	// Get current selected assignee IDs
	const currentAssigneeIds = task.assignees?.map((assignee) => assignee.id) || [];

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
			// Immediate optimistic update
			const optimisticTask = {
				...task,
				assignees: availableUsers.filter((user) => values.includes(user.id)),
			};
			const updatedTasks = tasks.map((t) => (t.id === task.id ? optimisticTask : t));
			setTasks(updatedTasks);
			setSelectedTask(optimisticTask);

			// Debounced API call + reconciliation
			await debouncedExecute(values);
		}
	};

	// Compact view: stacked avatars
	const renderCompactAssignees = () => {
		const assignees = task.assignees || [];
		if (assignees.length === 0) {
			return (
				<div className="flex items-center text-muted-foreground">
					<IconUserPlus className="h-4 w-4" />
				</div>
			);
		}

		const visibleAssignees = assignees.slice(0, maxCompactAvatars);
		const remainingCount = assignees.length - maxCompactAvatars;

		return (
			<div className="flex items-center">
				<div className="flex -space-x-2">
					{visibleAssignees.map((assignee) => (
						<Avatar key={assignee.id} className={cn("h-5 w-5", compact && "h-4 w-4")}>
							<AvatarImage src={assignee.image || undefined} alt={assignee.name} />
							<AvatarFallback className="text-[10px]">
								{assignee.name
									.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()
									.slice(0, 2)}
							</AvatarFallback>
						</Avatar>
					))}
				</div>
				{remainingCount > 0 && <span className="text-xs text-muted-foreground ml-1">+{remainingCount}</span>}
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-3">
			{!customTrigger && showLabel && <Label variant={"subheading"}>Assigned</Label>}
			<div className="flex flex-wrap gap-1">
				{compact ? (
					// Compact mode: stacked avatars, clicking opens dropdown
					<ComboBox
						values={currentAssigneeIds}
						onValuesChange={handleAssigneesChange}
						open={open}
						onOpenChange={setOpen}
					>
						<ComboBoxTrigger
							disabled={!editable}
							className={cn("h-auto p-1 bg-transparent border-transparent", className)}
						>
							{renderCompactAssignees()}
						</ComboBoxTrigger>
						<ComboBoxContent className="" align={align} side={side}>
							<ComboBoxSearch placeholder="Assign to..." />
							<ComboBoxList>
								<ComboBoxEmpty>No users found.</ComboBoxEmpty>
								<ComboBoxGroup>
									{availableUsers.map((user) => (
										<ComboBoxItem key={user.id} value={user.id} searchValue={user.name.toLowerCase()}>
											<Avatar className="h-6 w-6">
												<AvatarImage src={user.image || undefined} alt={user.name} />
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
				) : (
					// Full mode: show assignees with names
					<>
						{!customTrigger &&
							task.assignees.map((assignee) => (
								<RenderAssignee
									key={assignee.id}
									assignee={assignee as schema.userType}
									onRemove={(assigneeId) => {
										handleAssigneesChange(currentAssigneeIds.filter((id) => id !== assigneeId));
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
								<ComboBoxTrigger disabled={!editable} className="h-6 w-6 aspect-square p-0 justify-center">
									<IconPlus size={14} />
								</ComboBoxTrigger>
							)}

							<ComboBoxContent className="" align={align} side={side}>
								<ComboBoxSearch placeholder="Assign to..." />
								<ComboBoxList>
									<ComboBoxEmpty>No users found.</ComboBoxEmpty>
									<ComboBoxGroup>
										{availableUsers.map((user) => (
											<ComboBoxItem key={user.id} value={user.id} searchValue={user.name.toLowerCase()}>
												<Avatar className="h-6 w-6">
													<AvatarImage src={user.image || undefined} alt={user.name} />
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
					</>
				)}
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
			variant="primary"
			className={cn(
				"justify-start group/assignee relative h-auto py-1 bg-transparent border-transparent px-1",
				showRemove && "pr-6",
				className
			)}
			onClick={onClick ? (e) => onClick(e, assignee.id) : undefined}
		>
			<Avatar className="h-4 w-4">
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
			<span className="truncate text-xs">{assignee.name}</span>
			{showRemove && onRemove && (
				<div className="shrink-0 absolute inset-y-0 flex items-center justify-center end-0 pr-1">
					<XIcon
						size={12}
						className="cursor-pointer hover:bg-muted rounded-sm shrink-0 opacity-0 group-hover/assignee:opacity-100 transition-all"
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

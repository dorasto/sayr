"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { cn } from "@repo/ui/lib/utils";
import { formatDateCompact } from "@repo/util";
import { IconAppWindow, IconCircleFilled, IconLink, IconUserOff, IconWindow } from "@tabler/icons-react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRef, useState } from "react";
import { organization, project } from "../../../../../../../../../../../packages/database/schema";
import { priorityConfig, statusConfig } from "../../../shared/task-config";
import GlobalTaskAssignees from "../../assignee";
import { RenderLabel } from "../../label";
import GlobalTaskPriority from "../../priority";
import GlobalTaskStatus from "../../status";

interface TaskListItemProps {
	task: schema.TaskWithLabels;
	isSelected: boolean;
	onSelect: (selected: boolean) => void;
	onTaskClick?: (taskId: string) => void;
	onTaskUpdate?: (taskId: string, updates: Partial<schema.TaskWithLabels>) => void;
	setSelectedTask?: (task: schema.TaskWithLabels | null) => void;
	tasks?: schema.TaskWithLabels[];
	setTasks?: (tasks: schema.TaskWithLabels[]) => void;
	availableUsers?: schema.userType[];
}

export function TaskListItem({
	task,
	isSelected,
	onSelect,
	onTaskClick,
	onTaskUpdate,
	setSelectedTask,
	tasks,
	setTasks,
	availableUsers = [],
}: TaskListItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
	const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
	const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
	const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
	const preventClickRef = useRef(false);

	// Check if any popover is currently open
	const hasOpenPopover = statusPopoverOpen || priorityPopoverOpen || assigneePopoverOpen;

	const handleTaskClick = (e: React.MouseEvent<HTMLDivElement>) => {
		// Check if we should prevent this click
		if (preventClickRef.current) {
			preventClickRef.current = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		// Prevent click from propagating to parent if a specific element is clicked
		if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
			return;
		}

		onTaskClick?.(task.id);
	};

	const handleStatusChange = (newStatus: string) => {
		// Set flag to prevent next click and close popover
		preventClickRef.current = true;
		setStatusPopoverOpen(false);

		// Clear the flag after a longer delay to be safe
		setTimeout(() => {
			preventClickRef.current = false;
		}, 500);

		onTaskUpdate?.(task.id, { status: newStatus as schema.TaskWithLabels["status"] });
	};

	const handleStatusPopoverChange = (open: boolean) => {
		setStatusPopoverOpen(open);
		if (!open) {
			// When popover closes, set prevent flag briefly
			preventClickRef.current = true;
			setTimeout(() => {
				preventClickRef.current = false;
			}, 200);
		}
	};

	const handlePriorityChange = (newPriority: string) => {
		// Set flag to prevent next click and close popover
		preventClickRef.current = true;
		setPriorityPopoverOpen(false);

		// Clear the flag after a longer delay to be safe
		setTimeout(() => {
			preventClickRef.current = false;
		}, 500);

		onTaskUpdate?.(task.id, { priority: newPriority as schema.TaskWithLabels["priority"] });
	};

	const handlePriorityPopoverChange = (open: boolean) => {
		setPriorityPopoverOpen(open);
		if (!open) {
			// When popover closes, set prevent flag briefly
			preventClickRef.current = true;
			setTimeout(() => {
				preventClickRef.current = false;
			}, 200);
		}
	};

	const handleAssigneeChange = (userIds: string[]) => {
		// Set flag to prevent next click and close popover
		preventClickRef.current = true;
		setAssigneePopoverOpen(false);

		// Clear the flag after a longer delay to be safe
		setTimeout(() => {
			preventClickRef.current = false;
		}, 500);

		// Update task with new assignees
		const updatedAssignees = availableUsers.filter((user) => userIds.includes(user.id));
		onTaskUpdate?.(task.id, { assignees: updatedAssignees });
	};

	const handleAssigneePopoverChange = (open: boolean) => {
		setAssigneePopoverOpen(open);
		if (!open) {
			// When popover closes, set prevent flag briefly
			preventClickRef.current = true;
			setTimeout(() => {
				preventClickRef.current = false;
			}, 200);
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger className="relative select-none group/context" asChild>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: need button in button, but no hydration/render error */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: need button in button, but no hydration/render error */}
				<div
					className={cn(
						"block cursor-pointer w-full text-left bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
					)}
					onClick={handleTaskClick}
					onClickCapture={(e) => {
						if (preventClickRef.current) {
							e.preventDefault();
							e.stopPropagation();
							return;
						}
					}}
				>
					<div
						className={cn(
							"px-4 group/list-block h-11 max-h-11 relative flex gap-3 bg-transparent hover:bg-accent py-3 text-sm transition-colors flex-row items-center rounded data-[state=open]:bg-accent",
							isSelected && "bg-primary/10",
							hasOpenPopover && "bg-accent"
						)}
					>
						{/* Left section with checkbox, task ID, and title */}
						<div className="flex gap-2 w-full truncate">
							<div className="flex flex-grow items-center gap-1 truncate">
								<div className="flex items-center gap-1">
									{/* Checkbox */}
									<div className="shrink-0 grid place-items-center">
										<div className="relative shrink-0 flex">
											<Checkbox
												checked={isSelected}
												onCheckedChange={(checked) => {
													onSelect(checked as boolean);
												}}
												data-no-propagate
												className={cn(
													"opacity-0 pointer-events-none group-hover/list-block:opacity-100 group-hover/list-block:pointer-events-auto transition-opacity shrink-0",
													isSelected && "opacity-100",
													"group-active/context:opacity-100"
												)}
											/>
										</div>
									</div>
									{/* Priority */}
									<GlobalTaskPriority
										task={task}
										editable={true}
										onChange={handlePriorityChange}
										useInternalLogic={true}
										tasks={tasks}
										setTasks={setTasks}
										setSelectedTask={setSelectedTask}
										open={priorityPopoverOpen}
										setOpen={handlePriorityPopoverChange}
										customTrigger={
											<button
												type="button"
												className="h-4 flex items-center gap-1.5 rounded text-xs p-0.5 cursor-pointer"
												data-no-propagate
												// No onClick needed, ComboBoxTrigger handles it
											>
												{priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
											</button>
										}
									/>

									{/* Task ID */}
									<div className="shrink-0 min-w-9 w-9 max-w-9">
										<div className="flex items-center space-x-2">
											<span className="text-xs font-medium text-muted-foreground truncate">
												#{task.shortId}
											</span>
										</div>
									</div>
								</div>

								{/* Status icon - clickable */}
								{/* Status dropdown - controlled externally */}
								<GlobalTaskStatus
									task={task}
									editable={true}
									onChange={handleStatusChange}
									useInternalLogic={true}
									tasks={tasks}
									setTasks={setTasks}
									setSelectedTask={setSelectedTask}
									open={statusPopoverOpen}
									setOpen={handleStatusPopoverChange}
									data-no-propagate
									customTrigger={
										<button
											type="button"
											className="size-4 grid place-items-center shrink-0 cursor-pointer"
											data-no-propagate
											// No onClick needed, ComboBoxTrigger handles it
										>
											{status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)}
										</button>
									}
								/>

								{/* Title */}
								<p className="truncate cursor-pointer text-base text-foreground w-full">{task.title}</p>
							</div>
						</div>
						{/* Right section with metadata and actions */}
						<div className="flex shrink-0 items-center gap-2">
							<div className="relative flex flex-wrap flex-grow shrink-0 items-center gap-2 whitespace-nowrap">
								{/* Labels */}
								{task.labels && task.labels.length > 0 && (
									<div className="hidden sm:flex h-5 gap-1 max-w-[400px] overflow-x-auto">
										{task.labels.slice(0, 3).map((label) => (
											<RenderLabel
												label={label}
												key={label.id + nanoid(5)}
												onClick={() => {
													// e.stopPropagation();
													// Add assignee change logic here
												}}
												data-no-propagate
											/>
										))}
										{task.labels.length > 3 && (
											<Badge
												variant="secondary"
												className="flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label cursor-pointer w-fit relative shrink-0"
												onClick={(e) => {
													e.stopPropagation();
													// Add logic to show all labels here
												}}
											>
												<div className="flex -space-x-1.5">
													{task.labels.slice(3).map((label) => (
														<IconCircleFilled
															key={label.id + nanoid(5)}
															className="h-3 w-3"
															style={{
																color: label.color || "var(--foreground)",
															}}
														/>
													))}
												</div>
												+{task.labels.length - 3} more
											</Badge>
										)}
									</div>
								)}
								{/* Assignees */}
								<GlobalTaskAssignees
									task={task}
									editable={true}
									availableUsers={availableUsers}
									onChange={handleAssigneeChange}
									useInternalLogic={true}
									tasks={tasks}
									setTasks={setTasks}
									setSelectedTask={setSelectedTask}
									open={assigneePopoverOpen}
									setOpen={handleAssigneePopoverChange}
									side="left"
									customTrigger={
										task.assignees && task.assignees.length > 0 ? (
											<div className="flex items-center cursor-pointer" data-no-propagate>
												{task.assignees.length === 1 ? (
													// Single assignee - full avatar
													<Avatar className={cn("rounded-full h-5 w-5")}>
														<AvatarImage
															src={task.assignees[0]?.image || "/avatar.jpg"}
															alt={task.assignees[0]?.name}
														/>
														<AvatarFallback className="rounded-full bg-accent uppercase text-xs">
															{task.assignees[0]?.name.slice(0, 2)}
														</AvatarFallback>
													</Avatar>
												) : (
													// Multiple assignees - overlapping avatars
													<div className="flex -space-x-2">
														{task.assignees.slice(0, 3).map((assignee, index) => (
															<Avatar
																key={assignee.id + nanoid(5)}
																className={cn("rounded-full h-5 w-5", index > 0 && "relative")}
																style={{ zIndex: task.assignees.length - index }}
															>
																<AvatarImage
																	src={assignee?.image || "/avatar.jpg"}
																	alt={assignee?.name}
																/>
																<AvatarFallback className="rounded-full bg-accent uppercase text-xs">
																	{assignee?.name.slice(0, 2)}
																</AvatarFallback>
															</Avatar>
														))}
														{task.assignees.length > 3 && (
															<div className="flex items-center justify-center rounded-full h-5 w-5 bg-muted border-2 border-background text-xs font-medium text-muted-foreground relative">
																+{task.assignees.length - 3}
															</div>
														)}
													</div>
												)}
											</div>
										) : (
											// No assignees
											<div
												className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5 cursor-pointer"
												data-no-propagate
											>
												<IconUserOff className="h-3 w-3 shrink-0" />
											</div>
										)
									}
								/>
								<span className="text-xs text-muted-foreground truncate">
									{formatDateCompact(task.createdAt as Date)}
								</span>
							</div>
							{/* Desktop menu */}
							{/* <div className="flex">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="relative grid place-items-center rounded p-1 hover:bg-muted cursor-pointer h-auto w-auto"
									>
										<Ellipsis className="h-3.5 w-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuItem>View details</DropdownMenuItem>
									<DropdownMenuItem>Edit task</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.id)}>
										Copy task ID
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div> */}
						</div>
					</div>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				<ContextMenuItem inset onClick={handleTaskClick} className="gap-1 w-full">
					<IconAppWindow className="size-4" />
					Open
				</ContextMenuItem>
				<Link href={``}>
					<ContextMenuItem inset className="gap-1 w-full">
						<IconLink className="size-4" />
						Full page
					</ContextMenuItem>
				</Link>
				<ContextMenuItem inset>Reload</ContextMenuItem>
				<ContextMenuSub>
					<ContextMenuSubTrigger inset>Status</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-44">
						<ContextMenuItem>...</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuCheckboxItem checked>Show Bookmarks</ContextMenuCheckboxItem>
				<ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
				<ContextMenuSeparator />
				<ContextMenuRadioGroup value="pedro">
					<ContextMenuLabel inset>People</ContextMenuLabel>
					<ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
					<ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
				</ContextMenuRadioGroup>
			</ContextMenuContent>
		</ContextMenu>
	);
}

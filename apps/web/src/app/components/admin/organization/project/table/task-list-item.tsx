"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { cn } from "@repo/ui/lib/utils";
import { formatDateCompact } from "@repo/util";
import { IconAlertSquareFilled, IconPencil } from "@tabler/icons-react";
import { Ellipsis, Users } from "lucide-react";
import { useState } from "react";
import type { TaskType } from "../list";

interface TaskListItemProps {
	task: TaskType;
	isSelected: boolean;
	onSelect: (selected: boolean) => void;
	onTaskClick?: (taskId: string) => void;
}

const statusConfig = {
	backlog: {
		label: "Backlog",
		icon: (className: string) => <StatusIcon status="backlog" className={className} />,
		className: "text-muted-foreground",
	},
	todo: {
		label: "Todo",
		icon: (className: string) => <StatusIcon status="todo" className={className} />,
		className: "text-foreground",
	},
	"in-progress": {
		label: "In Progress",
		icon: (className: string) => <StatusIcon status="in-progress" className={className} />,
		className: "text-primary fill-primary",
	},
	done: {
		label: "Done",
		icon: (className: string) => <StatusIcon status="done" className={className} />,
		className: "text-success",
	},
	canceled: {
		label: "Canceled",
		icon: (className: string) => <StatusIcon status="canceled" className={className} />,
		className: "text-desctructive",
	},
};

const priorityConfig = {
	low: {
		label: "Low",
		icon: (className: string) => <PriorityIcon bars={1} className={className} />,
		className: "text-gray-500",
	},
	medium: {
		label: "Medium",
		icon: (className: string) => <PriorityIcon bars={2} className={className} />,
		className: "text-yellow-500",
	},
	high: {
		label: "High",
		icon: (className: string) => <PriorityIcon bars={3} className={className} />,
		className: "text-red-500",
	},
	urgent: {
		label: "Urgent",
		icon: (className: string) => <IconAlertSquareFilled className={className} />,
		className: " text-destructive",
	},
	none: {
		label: "None",
		icon: (className: string) => <PriorityIcon bars="none" className={className} />,
		className: "text-gray-400",
	},
};

export function TaskListItem({ task, isSelected, onSelect, onTaskClick }: TaskListItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

	const handleTaskClick = () => {
		onTaskClick?.(task.id);
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger className="relative select-none group/context" asChild>
				<button
					type="button"
					className={cn(
						"block cursor-pointer w-full text-left bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
					)}
					onClick={handleTaskClick}
				>
					<div
						className={cn(
							"px-4 group/list-block h-11 max-h-11 relative flex flex-col gap-3 bg-transparent hover:bg-accent py-3 text-sm transition-colors lg:flex-row lg:items-center rounded data-[state=open]:bg-accent",
							isSelected && "bg-primary/10"
						)}
					>
						{/* Left section with checkbox, task ID, and title */}
						<div className="flex gap-2 w-full truncate">
							<div className="flex flex-grow items-center gap-1 truncate">
								<div className="flex items-center gap-1">
									{/* Checkbox */}
									<div className="flex-shrink-0 grid place-items-center">
										<div className="relative flex-shrink-0 flex">
											<Checkbox
												checked={isSelected}
												onCheckedChange={(checked) => {
													onSelect(checked as boolean);
												}}
												onClick={(e) => e.stopPropagation()}
												className={cn(
													"opacity-0 pointer-events-none group-hover/list-block:opacity-100 group-hover/list-block:pointer-events-auto transition-opacity shrink-0",
													isSelected && "opacity-100",
													"group-active/context:opacity-100"
												)}
											/>
										</div>
									</div>
									{/* priority */}

									<Button
										variant="ghost"
										size="sm"
										className="h-4 flex items-center gap-1.5 rounded text-xs p-0.5 "
										onClick={(e) => {
											e.stopPropagation();
											// Add priority change logic here
										}}
									>
										{priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
									</Button>

									{/* Task ID */}
									<div className="flex-shrink-0 min-w-9 w-9 max-w-9">
										<div className="flex items-center space-x-2">
											<span className="text-xs font-medium text-muted-foreground truncate">{task.id}</span>
										</div>
									</div>
								</div>

								{/* Status icon */}
								<div className="size-4 grid place-items-center flex-shrink-0">
									{status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)}
								</div>
								{/* Title */}
								<p className="truncate cursor-pointer text-base text-foreground w-full">{task.title}</p>
							</div>
						</div>
						{/* Right section with metadata and actions */}
						<div className="flex flex-shrink-0 items-center gap-2">
							<div className="relative flex flex-wrap lg:flex-grow lg:flex-shrink-0 items-center gap-2 whitespace-nowrap">
								{/* Assignee */}
								<div className="h-5">
									<Button
										variant="ghost"
										size="sm"
										className="h-full flex items-center gap-1.5 rounded p-2 text-xs"
										onClick={(e) => {
											e.stopPropagation();
											// Add assignee change logic here
										}}
									>
										<Users className="h-3 w-3 mx-[4px] flex-shrink-0" />
										{/* replace with user icon */}
									</Button>
								</div>

								{/* Labels */}
								{task.labels && task.labels.length > 0 && (
									<div className="flex h-5 gap-1 max-w-[400px] overflow-x-auto">
										{task.labels.map((label) => (
											<Badge
												key={label.id}
												variant="outline"
												className="flex overflow-hidden justify-center h-full flex-shrink-0 items-center rounded px-2.5 text-xs cursor-pointer"
												onClick={(e) => {
													e.stopPropagation();
													// Add label click logic here
												}}
											>
												<div className="flex items-center gap-1.5 overflow-hidden">
													<span
														className="h-2 w-2 flex-shrink-0 rounded-full"
														style={{ backgroundColor: label.color || "#cccccc" }}
													/>
													<div className="line-clamp-1 inline-block w-auto max-w-[120px] truncate">
														{label.name}
													</div>
												</div>
											</Badge>
										))}
									</div>
								)}
								<span className="text-xs text-muted-foreground truncate">
									{formatDateCompact(task.createdAt)}
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
				</button>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				<ContextMenuItem inset>Back</ContextMenuItem>
				<ContextMenuItem inset disabled>
					Forward
				</ContextMenuItem>
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

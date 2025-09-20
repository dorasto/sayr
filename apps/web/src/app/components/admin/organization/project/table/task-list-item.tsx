"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import {
	IconAlertSquare,
	IconAlertSquareFilled,
	IconAntennaBars1,
	IconAntennaBars2,
	IconAntennaBars3,
	IconAntennaBars5,
} from "@tabler/icons-react";
import {
	Ban,
	Calendar,
	CalendarCheck2,
	ChevronDown,
	ChevronUp,
	Circle,
	Ellipsis,
	Link,
	Minus,
	Users,
} from "lucide-react";
import type { TaskType } from "../list";

interface TaskListItemProps {
	task: TaskType;
	isSelected: boolean;
	onSelect: (selected: boolean) => void;
}

const statusConfig = {
	backlog: {
		label: "Backlog",
		icon: Circle,
		className: "text-gray-500",
	},
	todo: {
		label: "Todo",
		icon: Circle,
		className: "text-blue-500",
	},
	"in-progress": {
		label: "In Progress",
		icon: Circle,
		className: "text-orange-500 fill-current",
	},
	done: {
		label: "Done",
		icon: Circle,
		className: "text-green-500 fill-current",
	},
	canceled: {
		label: "Canceled",
		icon: Ban,
		className: "text-red-500",
	},
};

const priorityConfig = {
	low: {
		label: "Low",
		icon: IconAntennaBars2,
		className: "text-gray-500",
	},
	medium: {
		label: "Medium",
		icon: IconAntennaBars3,
		className: "text-yellow-500",
	},
	high: {
		label: "High",
		icon: IconAntennaBars5,
		className: "text-red-500",
	},
	urgent: {
		label: "Urgent",
		icon: IconAlertSquareFilled,
		className: " text-destructive",
	},
	none: {
		label: "None",
		icon: IconAntennaBars1,
		className: "text-gray-400",
	},
};

export function TaskListItem({ task, isSelected, onSelect }: TaskListItemProps) {
	const status = statusConfig[task.status as keyof typeof statusConfig];
	const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
	const StatusIcon = status?.icon || Circle;
	const PriorityIcon = priority?.icon || Ban;

	return (
		<div className="relative select-none">
			<div
				className={cn(
					"px-4 group/list-block h-11 max-h-11 relative flex flex-col gap-3 bg-transparent hover:bg-accent py-3 text-sm transition-colors lg:flex-row lg:items-center rounded",
					isSelected && "bg-primary/10"
				)}
			>
				{/* Left section with checkbox, task ID, and title */}
				<div className="flex gap-2 w-full truncate">
					<div className="flex flex-grow items-center gap-1 truncate">
						{/* Checkbox */}
						<div className="flex-shrink-0 grid place-items-center">
							<div className="relative flex-shrink-0 flex">
								<Checkbox
									checked={isSelected}
									onCheckedChange={onSelect}
									className={cn(
										"opacity-0 pointer-events-none group-hover/list-block:opacity-100 group-hover/list-block:pointer-events-auto transition-opacity shrink-0",
										isSelected && "opacity-100"
									)}
								/>
							</div>
						</div>
						{/* priority */}
						<div className="h-5">
							<Button
								variant="ghost"
								size="sm"
								className="h-full flex items-center gap-1.5 rounded text-xs p-0.5 "
							>
								<PriorityIcon className={`h-3.5 w-3.5 ${priority?.className || ""}`} />
							</Button>
						</div>
						{/* Task ID */}
						<div className="flex-shrink-0 min-w-9 w-9 max-w-9">
							<div className="flex items-center space-x-2">
								<span className="text-xs font-medium text-muted-foreground">{task.id}</span>
							</div>
						</div>

						{/* Status icon */}
						<div className="size-4 grid place-items-center flex-shrink-0">
							<StatusIcon className={`h-4 w-4 ${status?.className || ""}`} />
						</div>
						{/* Title */}
						<p className="truncate cursor-pointer text-base text-foreground">{task.title}</p>
					</div>

					{/* Mobile menu button */}
					{/* <div className="block border border-gray-300 dark:border-gray-600 rounded lg:hidden">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									className="relative grid place-items-center rounded p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 h-auto w-auto"
								>
									<Ellipsis className="h-3.5 w-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuItem>View details</DropdownMenuItem>
								<DropdownMenuItem>Edit task</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem>Copy task ID</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div> */}
				</div>

				{/* Right section with metadata and actions */}
				<div className="flex flex-shrink-0 items-center gap-2">
					<div className="relative flex flex-wrap lg:flex-grow lg:flex-shrink-0 items-center gap-2 whitespace-nowrap">
						{/* Priority */}
						<div className="h-5">
							<Button
								variant="accent"
								size="sm"
								className="h-full flex items-center gap-1.5 rounded text-xs p-0.5 "
							>
								<PriorityIcon className={`h-3.5 w-3.5 ${priority?.className || ""}`} />
							</Button>
						</div>

						{/* Assignee */}
						<div className="h-5">
							<Button variant="ghost" size="sm" className="h-full flex items-center gap-1.5 rounded p-2 text-xs">
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
					</div>

					{/* Desktop menu */}
					<div className="flex">
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
					</div>
				</div>
			</div>
		</div>
	);
}

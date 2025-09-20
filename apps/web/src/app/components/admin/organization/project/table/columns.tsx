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
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import type { TaskType } from "../list";

const labels = [
	{
		value: "bug",
		label: "Bug",
	},
	{
		value: "feature",
		label: "Feature",
	},
	{
		value: "documentation",
		label: "Documentation",
	},
];

const statuses = [
	{
		value: "backlog",
		label: "Backlog",
		icon: "○",
	},
	{
		value: "todo",
		label: "Todo",
		icon: "○",
	},
	{
		value: "in-progress",
		label: "In Progress",
		icon: "◐",
	},
	{
		value: "done",
		label: "Done",
		icon: "●",
	},
	{
		value: "canceled",
		label: "Canceled",
		icon: "✕",
	},
];

const priorities = [
	{
		label: "Low",
		value: "low",
		icon: "↓",
	},
	{
		label: "Medium",
		value: "medium",
		icon: "→",
	},
	{
		label: "High",
		value: "high",
		icon: "↑",
	},
];

export const columns: ColumnDef<TaskType>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "id",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 lg:px-3"
				>
					Task
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "title",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 lg:px-3"
				>
					Title
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const label = labels.find((label) => label.value === row.original.label.toLowerCase());

			return (
				<div className="flex space-x-2">
					{label && <Badge variant="outline">{label.label}</Badge>}
					<span className="max-w-[500px] truncate font-medium">{row.getValue("title")}</span>
				</div>
			);
		},
	},
	{
		accessorKey: "status",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 lg:px-3"
				>
					Status
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const status = statuses.find((status) => status.value === row.getValue("status"));

			if (!status) {
				return null;
			}

			return (
				<div className="flex w-[100px] items-center">
					<span className="mr-2">{status.icon}</span>
					{status.label}
				</div>
			);
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id));
		},
	},
	{
		accessorKey: "priority",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-8 px-2 lg:px-3"
				>
					Priority
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const priority = priorities.find((priority) => priority.value === row.getValue("priority"));

			if (!priority) {
				return null;
			}

			return (
				<div className="flex items-center">
					<span className="mr-2">{priority.icon}</span>
					{priority.label}
				</div>
			);
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id));
		},
	},
	{
		id: "actions",
		enableHiding: false,
		cell: ({ row }) => {
			const task = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.id)}>
							Copy task ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>View customer</DropdownMenuItem>
						<DropdownMenuItem>View task details</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];

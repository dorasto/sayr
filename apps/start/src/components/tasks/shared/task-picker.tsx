"use client";

import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { statusConfig } from "./config";

interface TaskPickerProps {
	/** All available tasks to pick from */
	tasks: schema.TaskWithLabels[];
	/** Currently selected task ID (if any) */
	value?: string | null;
	/** Called when a task is selected */
	onSelect: (task: schema.TaskWithLabels) => void;
	/** Task IDs to exclude from the list (e.g., the current task itself) */
	excludeIds?: string[];
	/** Filter function for additional filtering (e.g., exclude subtasks for parent picker) */
	filter?: (task: schema.TaskWithLabels) => boolean;
	/** Placeholder text for the search input */
	searchPlaceholder?: string;
	/** Placeholder text when no task is selected */
	placeholder?: string;
	/** Open state (controlled) */
	open?: boolean;
	/** Open change handler (controlled) */
	onOpenChange?: (open: boolean) => void;
	/** Custom trigger element (renders as child of ComboBoxTrigger asChild) */
	customTrigger?: React.ReactNode;
	/** Whether the trigger is interactive */
	editable?: boolean;
	/** Additional className for the trigger */
	className?: string;
}

/**
 * Reusable task picker popover using the ComboBox abstraction.
 * Used for selecting parent tasks, relation targets, etc.
 */
export default function TaskPicker({
	tasks,
	value,
	onSelect,
	excludeIds = [],
	filter,
	searchPlaceholder = "Search tasks...",
	placeholder = "Select task",
	open,
	onOpenChange,
	customTrigger,
	editable = true,
	className,
}: TaskPickerProps) {
	const excludeSet = new Set(excludeIds);

	const filteredTasks = tasks.filter((t) => {
		if (excludeSet.has(t.id)) return false;
		if (filter && !filter(t)) return false;
		return true;
	});

	const selectedTask = value ? tasks.find((t) => t.id === value) : null;

	const handleChange = (taskId: string | null) => {
		if (!taskId) return;
		const task = tasks.find((t) => t.id === taskId);
		if (task) {
			onSelect(task);
		}
	};

	return (
		<ComboBox
			value={value || ""}
			onValueChange={handleChange}
			open={open}
			onOpenChange={onOpenChange}
		>
			{customTrigger ? (
				<ComboBoxTrigger asChild>{customTrigger}</ComboBoxTrigger>
			) : (
				<ComboBoxTrigger disabled={!editable} className={className}>
					<ComboBoxValue placeholder={placeholder}>
						{selectedTask ? (
							<TaskPickerItem task={selectedTask} />
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</ComboBoxValue>
				</ComboBoxTrigger>
			)}

			<ComboBoxContent>
				<ComboBoxSearch icon placeholder={searchPlaceholder} />
				<ComboBoxList>
					<ComboBoxEmpty>No tasks found</ComboBoxEmpty>
					<ComboBoxGroup>
						{filteredTasks.map((t) => (
							<ComboBoxItem
								key={t.id}
								value={t.id}
								searchValue={`${t.shortId} ${t.title?.toLowerCase() ?? ""}`}
							>
								<TaskPickerItem task={t} />
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}

/** Compact task display for picker items and selected values */
export function TaskPickerItem({ task, className: itemClassName }: { task: { shortId?: number | null; title?: string | null; status: string }; className?: string }) {
	const config = statusConfig[task.status as keyof typeof statusConfig];
	return (
		<div className={cn("flex items-center gap-2 min-w-0", itemClassName)}>
			{config?.icon("h-3.5 w-3.5 shrink-0")}
			{task.shortId != null && (
				<span className="text-muted-foreground text-xs shrink-0">#{task.shortId}</span>
			)}
			<span className="truncate text-sm">{task.title ?? "Untitled"}</span>
		</div>
	);
}

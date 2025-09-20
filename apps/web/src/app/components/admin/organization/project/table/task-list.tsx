"use client";

import { headlessToast } from "@repo/ui/components/headless-toast";
import { useMemo, useState } from "react";
import type { TaskType } from "../list";
import { StatusSectionHeader } from "./status-section-header";
import { TaskListItem } from "./task-list-item";

interface TaskListProps {
	tasks: TaskType[];
}

// Define the order of statuses
const statusOrder = ["backlog", "todo", "in-progress", "done", "canceled"];

export function TaskList({ tasks }: TaskListProps) {
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

	const handleTaskSelect = (taskId: string, selected: boolean) => {
		const newSelected = new Set(selectedTasks);
		if (selected) {
			newSelected.add(taskId);
		} else {
			newSelected.delete(taskId);
		}
		setSelectedTasks(newSelected);
	};

	const handleToggleSection = (status: string) => {
		const newCollapsed = new Set(collapsedSections);
		if (newCollapsed.has(status)) {
			newCollapsed.delete(status);
		} else {
			newCollapsed.add(status);
		}
		setCollapsedSections(newCollapsed);
	};

	// Group tasks by status
	const groupedTasks = useMemo(() => {
		const groups: Record<string, TaskType[]> = {};

		// Initialize groups for all statuses
		statusOrder.forEach((status) => {
			groups[status] = [];
		});

		// Group tasks by status
		tasks.forEach((task) => {
			const status = task.status || "backlog";
			if (!groups[status]) {
				groups[status] = [];
			}
			groups[status].push(task);
		});

		// Return only groups that have tasks, in the correct order
		return statusOrder
			.filter((status) => groups[status] && groups[status].length > 0)
			.map((status) => ({
				status,
				tasks: groups[status],
				count: groups[status].length,
			}));
	}, [tasks]);

	return (
		<div className="rounded h-full">
			{/* Grouped task list */}
			{groupedTasks.length > 0 ? (
				groupedTasks.map(({ status, tasks: statusTasks, count }) => {
					const isCollapsed = collapsedSections.has(status);

					return (
						<div key={status} className="">
							<StatusSectionHeader
								status={status}
								count={count}
								isCollapsed={isCollapsed}
								onToggleCollapse={() => handleToggleSection(status)}
							/>

							{!isCollapsed && statusTasks && (
								<div className="py-1 flex flex-col gap-1">
									{statusTasks.map((task) => (
										<TaskListItem
											key={task.id}
											task={task}
											isSelected={selectedTasks.has(task.id)}
											onSelect={(selected) => handleTaskSelect(task.id, selected)}
											onTaskClick={() =>
												headlessToast({
													title: "This will soon navigate",
													description:
														"Maybe open in a sheet, maybe go straight to a page, maybe the ability to do BOTH?!?!?!?!?!?!?. Oh Trent, try right clicking btw its cool.",
												})
											}
										/>
									))}
								</div>
							)}
						</div>
					);
				})
			) : (
				<div className="h-24 flex items-center justify-center text-gray-500 dark:text-gray-400">No results.</div>
			)}
		</div>
	);
}

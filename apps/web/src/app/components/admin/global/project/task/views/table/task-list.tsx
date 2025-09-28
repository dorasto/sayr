"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useMemo, useState } from "react";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import { applyFilters } from "../../filter/filter-config";
import type { FilterState } from "../../filter/types";
import { StatusSectionHeader } from "./status-section-header";
import { TaskContent } from "./task-content";
import { TaskListItem } from "./task-list-item";

interface TaskListProps {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
	availableUsers?: schema.userType[];
	organization: schema.OrganizationWithMembers;
	project: schema.projectType;
}

// Define the order of statuses
const statusOrder = ["backlog", "todo", "in-progress", "done", "canceled"];

export function TaskList({ tasks, setTasks, ws, labels, availableUsers = [], organization, project }: TaskListProps) {
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
	const { value: selectedTask, setValue: setSelectedTask } = useStateManagement<schema.TaskWithLabels | null>(
		"task",
		null,
		3000
	);
	const { value: filterState } = useStateManagement<FilterState>("task-filters", { groups: [], operator: "AND" }, 1);
	const [isTaskContentOpen, setIsTaskContentOpen] = useState(false);

	// Apply filters to tasks
	const filteredTasks = useMemo(() => {
		return applyFilters(tasks, filterState);
	}, [tasks, filterState]);
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_TASK: (msg) => {
			const updatedTask = msg.data;
			const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
			setTasks(updatedTasks);
			if (selectedTask && selectedTask.id === updatedTask.id) {
				setSelectedTask({ ...selectedTask, ...updatedTask });
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	const handleTaskSelect = (taskId: string, selected: boolean) => {
		const newSelected = new Set(selectedTasks);
		if (selected) {
			newSelected.add(taskId);
		} else {
			newSelected.delete(taskId);
		}
		setSelectedTasks(newSelected);
	};

	const handleTaskClick = (taskId: string) => {
		const task = filteredTasks.find((t) => t.id === taskId);
		if (task) {
			setSelectedTask(task);
			setIsTaskContentOpen(true);
		}
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
		const groups: Record<string, schema.TaskWithLabels[]> = {};

		// Initialize groups for all statuses
		statusOrder.forEach((status) => {
			groups[status] = [];
		});

		// Group filtered tasks by status
		filteredTasks.forEach((task) => {
			const status = task.status || "backlog";
			if (!groups[status]) {
				groups[status] = [];
			}
			groups[status].push(task);
		});

		// Return only groups that have tasks, in the correct order
		return statusOrder
			.filter((status) => groups[status] && groups[status].length > 0)
			.map((status) => {
				const statusTasks = groups[status] || [];
				return {
					status,
					tasks: statusTasks,
					count: statusTasks.length,
				};
			});
	}, [filteredTasks]);

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
											onTaskClick={handleTaskClick}
											tasks={tasks}
											setTasks={setTasks}
											setSelectedTask={setSelectedTask}
											availableUsers={availableUsers}
										/>
									))}
								</div>
							)}
						</div>
					);
				})
			) : (
				<div className="flex items-center justify-center">No issues found</div>
			)}
			{selectedTask && (
				<TaskContent
					task={selectedTask}
					open={isTaskContentOpen}
					onOpenChange={(value) => {
						setIsTaskContentOpen(value);
						if (!value) {
							setSelectedTask(null);
						}
					}}
					labels={labels}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					availableUsers={availableUsers}
					organization={organization}
					project={project}
				/>
			)}
		</div>
	);
}

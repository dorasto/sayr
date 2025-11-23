"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import { applyFilters } from "../org/tasks/task/filter/filter-config";
import type { FilterState } from "../org/tasks/task/filter/types";
import { TASK_GROUPINGS } from "../org/tasks/task/grouping/config";
import { TaskGroupSectionHeader } from "../org/tasks/task/grouping/task-group-section-header";
import { useTaskViewState } from "../org/tasks/task/grouping/use-task-view-state";
import { TaskContent } from "../org/tasks/task/views/table/task-content";
import { TaskListItem } from "../org/tasks/task/views/table/task-list-item";

interface MyTaskListProps {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
	availableUsers: schema.userType[];
	organizations: schema.OrganizationWithMembers[];
	categories: schema.categoryType[];
}

export function MyTaskList({
	tasks,
	setTasks,
	ws,
	labels,
	availableUsers,
	organizations,
	categories,
}: MyTaskListProps) {
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
	const { value: selectedTask, setValue: setSelectedTask } = useStateManagement<schema.TaskWithLabels | null>(
		"task",
		null,
		3000
	);
	const { value: filterState } = useStateManagement<FilterState>("task-filters", { groups: [], operator: "AND" }, 1);
	const [taskContentOpenOrganization, setTaskContentOpenOrganization] = useQueryState(
		"org",
		parseAsString.withDefault("")
	);
	const [taskContentOpen, setTaskContentOpen] = useQueryState("task", parseAsInteger.withDefault(0));
	const { viewState } = useTaskViewState();
	const { grouping, showEmptyGroups } = viewState;

	useEffect(() => {
		setCollapsedSections(new Set());
		return () => {
			void grouping;
		};
	}, [grouping]);

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
				sendWindowMessage(
					window,
					{
						type: "timeline-update",
						payload: updatedTask.id,
					},
					"*"
				);
			}
		},
		UPDATE_TASK_COMMENTS: async (msg) => {
			if (selectedTask && selectedTask.id === msg.data.id) {
				sendWindowMessage(
					window,
					{
						type: "timeline-update",
						payload: msg.data.id,
					},
					"*"
				);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE MyTaskList]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	// Sync selected task with query param
	useEffect(() => {
		if (taskContentOpen === 0) {
			setSelectedTask(null);
		}
		const task = filteredTasks.find(
			(t) => t.shortId === taskContentOpen && t.organizationId === taskContentOpenOrganization
		);
		if (task) {
			setSelectedTask(task);
			setTaskContentOpen(task.shortId);
			setTaskContentOpenOrganization(task.organizationId);
		}
	}, [
		taskContentOpen,
		setSelectedTask,
		filteredTasks.find,
		setTaskContentOpen,
		setTaskContentOpenOrganization,
		taskContentOpenOrganization,
	]);

	const handleTaskSelect = (taskId: string, selected: boolean) => {
		const newSelected = new Set(selectedTasks);
		if (selected) {
			newSelected.add(taskId);
		} else {
			newSelected.delete(taskId);
		}
		setSelectedTasks(newSelected);
	};

	const handleTaskClick = (taskId: string, organizationId: string) => {
		const task = filteredTasks.find((t) => t.id === taskId && t.organizationId === organizationId);
		if (task) {
			setSelectedTask(task);
			setTaskContentOpen(task.shortId);
			setTaskContentOpenOrganization(task.organizationId);
		}
	};

	const handleToggleSection = (groupId: string) => {
		const newCollapsed = new Set(collapsedSections);
		if (newCollapsed.has(groupId)) {
			newCollapsed.delete(groupId);
		} else {
			newCollapsed.add(groupId);
		}
		setCollapsedSections(newCollapsed);
	};

	const groupingDefinition = useMemo(() => {
		return TASK_GROUPINGS[grouping] ?? TASK_GROUPINGS.status;
	}, [grouping]);

	const groupedTasks = useMemo(() => {
		return groupingDefinition.group({
			tasks: filteredTasks,
			availableUsers,
			showEmptyGroups,
			categories,
		});
	}, [filteredTasks, availableUsers, showEmptyGroups, groupingDefinition, categories]);

	// Find organization and project for the selected task
	const selectedTaskContext = useMemo(() => {
		if (!selectedTask) return null;

		const organization = organizations.find((org) => org.id === selectedTask.organizationId);

		return { organization };
	}, [selectedTask, organizations]);

	return (
		<div className="rounded h-full">
			{/* Grouped task list */}
			{groupedTasks.length > 0 ? (
				groupedTasks.map((group) => {
					const isCollapsed = collapsedSections.has(group.id);

					return (
						<div key={group.id} className="">
							<TaskGroupSectionHeader
								group={group}
								isCollapsed={isCollapsed}
								onToggleCollapse={() => handleToggleSection(group.id)}
							/>

							{!isCollapsed && (
								<div className="py-1 flex flex-col gap-1">
									{group.tasks.length > 0 ? (
										group.tasks.map((task) => (
											<TaskListItem
												key={`${group.id}:${task.id}`}
												task={task}
												isSelected={selectedTasks.has(task.id)}
												onSelect={(selected) => handleTaskSelect(task.id, selected)}
												onTaskClick={handleTaskClick}
												tasks={tasks}
												setTasks={setTasks}
												setSelectedTask={setSelectedTask}
												availableUsers={availableUsers}
												personal={true}
											/>
										))
									) : (
										<div className="px-4 py-3 text-xs text-muted-foreground">No tasks in this group</div>
									)}
								</div>
							)}
						</div>
					);
				})
			) : (
				<div className="flex items-center justify-center">No issues found</div>
			)}
			{selectedTask && selectedTaskContext?.organization && (
				<TaskContent
					task={selectedTask}
					open={typeof taskContentOpen === "number"}
					onOpenChange={(value) => {
						if (!value) {
							setTaskContentOpen(0);
							setTaskContentOpenOrganization("");
							setSelectedTask(null);
						}
					}}
					labels={labels}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					availableUsers={availableUsers}
					organization={selectedTaskContext.organization}
					ws={ws}
					categories={categories}
				/>
			)}
		</div>
	);
}

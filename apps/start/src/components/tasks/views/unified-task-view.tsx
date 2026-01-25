"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { KanbanBoard, KanbanCards, KanbanHeader, KanbanProvider } from "@repo/ui/components/kibo-ui/kanban/index";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTaskDetailParam } from "@/hooks/useTasksSearchParams";
import { useTaskViewManager } from "@/hooks/useTaskViewManager";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { updateAssigneesToTaskAction, updateTaskAction } from "@/lib/fetches/task";
import { useToastAction } from "@/lib/util";
import type { WSMessage } from "@/lib/ws";
import { applyFilters } from "../filter/filter-config";
import { applyNestedGrouping, type NestedTaskGroup } from "../shared/nested-grouping";
import { TaskContent } from "../task/task-content";
import { TaskGroupSectionHeader } from "../task/task-group-section-header";
import { UnifiedTaskItem } from "./unified-task-item";
import { useSticky } from "@/hooks/use-sticky";
import { useLayoutOrganization } from "@/contexts/ContextOrg";

interface UnifiedTaskViewProps {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	ws: WebSocket | null;
	labels: schema.labelType[];
	availableUsers: schema.userType[];
	organization: schema.OrganizationWithMembers;
	categories: schema.categoryType[];
	releases?: schema.releaseType[];
	compact?: boolean;
	forceShowCompleted?: boolean;
}

export function UnifiedTaskView({
	tasks,
	setTasks,
	ws,
	labels,
	availableUsers = [],
	organization,
	categories,
	releases = [],
	compact = false,
	forceShowCompleted = false,
}: UnifiedTaskViewProps) {
	console.log("[RENDER] UnifiedTaskView");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Get views from context for auto-loading saved views
	const { views } = useLayoutOrganization();

	// Shared State
	const { value: selectedTask, setValue: setSelectedTask } = useStateManagement<schema.TaskWithLabels | null>(
		"task",
		null,
		3000
	);
	const [taskContentOpen, setTaskContentOpen] = useTaskDetailParam();

	// Consolidated task view state management - pass views to enable auto-loading
	const { filters, grouping, subGrouping, showCompletedTasks, viewMode } = useTaskViewManager(views);

	// Override showCompletedTasks if forceShowCompleted is true
	const effectiveShowCompleted = forceShowCompleted || showCompletedTasks;

	const { runWithToast } = useToastAction();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");

	// List View Specific State
	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

	// Reset collapsed sections when grouping changes
	useEffect(() => {
		setCollapsedSections(new Set());
		void grouping;
	}, [grouping]);

	// Apply filters to tasks
	const filteredTasks = useMemo(() => {
		return applyFilters(tasks, filters);
	}, [tasks, filters]);

	// Sync selected task with query param
	useEffect(() => {
		if (taskContentOpen === 0) {
			setSelectedTask(null);
			return;
		}
		const task = filteredTasks.find((t) => t.shortId === taskContentOpen);
		if (task) {
			setSelectedTask(task);
			// Only update URL if the value is different (prevents unnecessary URL updates)
			// This can happen when filteredTasks changes but the selected task is still the same
		}
	}, [taskContentOpen, setSelectedTask, filteredTasks]);

	// WebSocket Handlers
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
						type: "timeline-update-comment",
						payload: msg.data.id,
					},
					"*"
				);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE UnifiedTaskView]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	// Handlers
	const handleTaskClick = (taskId: string) => {
		const task = filteredTasks.find((t) => t.id === taskId);
		if (task) {
			setSelectedTask(task);
			setTaskContentOpen(task.shortId);
		}
	};

	const handleTaskSelect = (taskId: string, selected: boolean) => {
		const newSelected = new Set(selectedTasks);
		if (selected) {
			newSelected.add(taskId);
		} else {
			newSelected.delete(taskId);
		}
		setSelectedTasks(newSelected);
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

	const handleTaskUpdate = async (taskId: string, updates: Partial<schema.TaskWithLabels>) => {
		const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
		setTasks(updatedTasks);

		if (updates.status) {
			await runWithToast(
				"update-status",
				{
					loading: { title: "Updating status..." },
					success: { title: "Status updated" },
					error: { title: "Failed to update status" },
				},
				() => updateTaskAction(organization.id, taskId, { status: updates.status }, wsClientId)
			);
		}
		if (updates.priority) {
			await runWithToast(
				"update-priority",
				{
					loading: { title: "Updating priority..." },
					success: { title: "Priority updated" },
					error: { title: "Failed to update priority" },
				},
				() => updateTaskAction(organization.id, taskId, { priority: updates.priority }, wsClientId)
			);
		}
		if (updates.assignees) {
			await runWithToast(
				"update-assignees",
				{
					loading: { title: "Updating assignees..." },
					success: { title: "Assignees updated" },
					error: { title: "Failed to update assignees" },
				},
				() =>
					updateAssigneesToTaskAction(
						organization.id,
						taskId,
						updates.assignees?.map((u) => u.id) || [],
						wsClientId
					)
			);
		}
	};

	// Grouping Logic with nested sub-grouping support
	const groupedTasks = useMemo((): NestedTaskGroup[] => {
		return applyNestedGrouping(grouping, subGrouping, {
			tasks: filteredTasks,
			availableUsers,
			showCompletedTasks: effectiveShowCompleted,
			categories,
			releases,
		});
	}, [filteredTasks, availableUsers, effectiveShowCompleted, grouping, subGrouping, categories, releases]);

	// Kanban Specific Data Preparation
	const columns = useMemo(() => groupedTasks.map((g) => ({ ...g, name: g.label })), [groupedTasks]);

	const kanbanData = useMemo(() => {
		return groupedTasks.flatMap((g) => g.tasks.map((t) => ({ ...t, column: g.id, name: t.title || "Untitled" })));
	}, [groupedTasks]);

	// biome-ignore lint/suspicious/noExplicitAny: <any>
	const handleKanbanDragEnd = async ({ active, over }: { active: any; over: any }) => {
		if (!over) return;

		const itemId = active.id as string;
		const overId = over.id as string;

		// Helper — detect which column this task was dropped into
		const findColumnId = (id: string): string | null => {
			if (id.startsWith("status:")) return id;
			for (const [columnId, column] of Object.entries(kanbanData)) {
				// biome-ignore lint/suspicious/noExplicitAny: <any>
				if ((column as any).items?.includes(id)) return columnId;
			}
			return null;
		};

		const targetColumn = findColumnId(overId);
		if (!targetColumn) return;

		const newColumnId = targetColumn;
		const updateLocal = (updates: Partial<schema.TaskWithLabels>) => {
			const updatedTasks = tasks.map((t) => (t.id === itemId ? { ...t, ...updates } : t));
			setTasks(updatedTasks);
		};

		// === STATUS GROUPING ===
		if (grouping === "status" && newColumnId.startsWith("status:")) {
			// biome-ignore lint/suspicious/noExplicitAny: <any>
			const status = newColumnId.replace("status:", "") as any;

			updateLocal({ status });
			await runWithToast(
				"update-task",
				{
					loading: { title: "Updating status..." },
					success: { title: "Status updated" },
					error: { title: "Failed to update status" },
				},
				() => updateTaskAction(organization.id, itemId, { status }, wsClientId)
			);
		}

		// === PRIORITY GROUPING ===
		else if (grouping === "priority") {
			// biome-ignore lint/suspicious/noExplicitAny: <any>
			const priority = newColumnId as any;
			updateLocal({ priority });
			await runWithToast(
				"update-task",
				{
					loading: { title: "Updating priority..." },
					success: { title: "Priority updated" },
					error: { title: "Failed to update priority" },
				},
				() => updateTaskAction(organization.id, itemId, { priority }, wsClientId)
			);
		}

		// === ASSIGNEE GROUPING ===
		else if (grouping === "assignee") {
			let newAssignees: schema.userType[] = [];
			if (newColumnId !== "unassigned") {
				const user = availableUsers.find((u) => u.id === newColumnId);
				if (user) newAssignees = [user];
			}

			updateLocal({ assignees: newAssignees });
			await runWithToast(
				"update-task",
				{
					loading: { title: "Updating assignee..." },
					success: { title: "Assignee updated" },
					error: { title: "Failed to update assignee" },
				},
				() =>
					updateAssigneesToTaskAction(
						organization.id,
						itemId,
						newAssignees.map((u) => u.id),
						wsClientId
					)
			);
		}

		// === CATEGORY GROUPING ===
		else if (grouping === "category") {
			const categoryId = newColumnId === "uncategorized" ? null : newColumnId;
			updateLocal({ category: categoryId });
			await runWithToast(
				"update-task",
				{
					loading: { title: "Updating category..." },
					success: { title: "Category updated" },
					error: { title: "Failed to update category" },
				},
				() => updateTaskAction(organization.id, itemId, { category: categoryId }, wsClientId)
			);
		}

		console.log(`✅ Task ${itemId} dropped into column ${newColumnId}`);
	};
	const { stuck, stickyRef } = useSticky();

	if (!mounted) {
		return (
			<div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-background">
				<div className="relative flex items-center justify-center">
					<IconLoader2 className="w-12 h-12 text-primary animate-spin" />
					<IconLoader2 className="absolute w-6 h-6 text-primary/50 animate-spin direction-reverse" />
				</div>
			</div>
		);
	}
	// Check if we have sub-groups for kanban view
	const hasKanbanSubGroups =
		viewMode === "kanban" &&
		groupedTasks.length > 0 &&
		groupedTasks[0]?.subGroups &&
		groupedTasks[0].subGroups.length > 0;

	return (
		<div className="h-full overflow-auto rounded">
			{viewMode === "kanban" ? (
				hasKanbanSubGroups ? (
					// Linear-style grid: Column headers at top, sub-groups as horizontal ROWS spanning all columns
					// Columns expand to fill width, but scroll horizontally if they'd be narrower than min-width
					<div className="h-full overflow-auto">
						<div className="flex flex-col min-w-full w-fit">
							{/* Column headers row - sticky at top */}
							<div className="flex sticky top-0 z-30 overflow-hidden">
								{groupedTasks.map((primaryGroup) => (
									<div
										key={primaryGroup.id}
										className="flex items-center justify-between px-3 py-2 bg-muted min-w-[280px] flex-1 gap-2 border-r border-dashed last:border-r-0 p-3"
									>
										<div className="flex items-center gap-2">
											{primaryGroup.icon && (
												<span className={cn("text-sm", primaryGroup.accentClassName)}>
													{primaryGroup.icon}
												</span>
											)}
											<span className="text-sm font-semibold">{primaryGroup.label}</span>
										</div>
										<Badge variant="outline" className="text-xs h-5 px-2">
											{primaryGroup.count}
										</Badge>
									</div>
								))}
							</div>

							{/* Rows - each sub-group is a row spanning all columns */}
							{groupedTasks[0]?.subGroups?.map((subGroupTemplate) => {
								const rowTotal = groupedTasks.reduce((sum, col) => {
									const sg = col.subGroups?.find((s) => s.id === subGroupTemplate.id);
									return sum + (sg?.tasks.length || 0);
								}, 0);

								return (
									<div key={subGroupTemplate.id} className="">
										{/* Row header bar - sticky below column headers (top-[50px] accounts for header height) */}
										<div
											className={cn(
												"flex items-center gap-2 py-2 px-2 bg-accent border-b sticky top-9 z-20 "
											)}
										>
											<div className="flex items-center gap-2 z-10 sticky left-2">
												{subGroupTemplate.icon && (
													<span className={cn("text-sm", subGroupTemplate.accentClassName)}>
														{subGroupTemplate.icon}
													</span>
												)}
												<span className="text-sm font-medium whitespace-nowrap">
													{subGroupTemplate.label}
												</span>
												<Badge variant="secondary" className="text-xs h-5 px-1.5">
													{rowTotal}
												</Badge>
											</div>
										</div>

										{/* Grid of cells for this row */}
										<div className="flex ">
											{groupedTasks.map((primaryGroup) => {
												const subGroup = primaryGroup.subGroups?.find(
													(sg) => sg.id === subGroupTemplate.id
												);
												const tasks = subGroup?.tasks || [];

												return (
													<div
														key={`${primaryGroup.id}-${subGroupTemplate.id}`}
														className="min-w-[280px] flex-1 flex flex-col gap-2 border-r border-dashed last:border-r-0 p-1"
													>
														{tasks.length > 0 ? (
															tasks.map((task) => (
																<UnifiedTaskItem
																	key={task.id}
																	viewMode="kanban"
																	task={task}
																	columnId={primaryGroup.id}
																	onTaskClick={handleTaskClick}
																	tasks={tasks}
																	setTasks={setTasks}
																	availableUsers={availableUsers}
																	onTaskUpdate={handleTaskUpdate}
																	categories={categories}
																/>
															))
														) : (
															<div className="h-8" />
														)}
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				) : (
					// Original kanban without sub-groups
					<KanbanProvider columns={columns} data={kanbanData} className="gap-1" onDragEnd={handleKanbanDragEnd}>
						{(column) => (
							<KanbanBoard
								key={column.id}
								id={column.id}
								className="bg-transparent border-0 rounded-lg shadow-none flex flex-col h-full w-full min-w-72 max-w-72 px-2"
							>
								<KanbanHeader className="pb-2 flex items-center justify-between bg-card border-0 rounded-lg shrink-0 min-h-[42px]">
									<div className="flex items-center gap-2">
										{column.icon && (
											<span className={cn("text-sm font-medium", column.accentClassName)}>
												{column.icon}
											</span>
										)}
										<div className="flex flex-col leading-tight">
											<span className="font-medium text-sm">{column.name}</span>
											{column.description && (
												<span className="text-xs text-muted-foreground">{column.description}</span>
											)}
										</div>
									</div>
									<Badge
										variant="outline"
										className="rounded pointer-events-none border-transparent text-muted-foreground bg-transparent"
									>
										{kanbanData.filter((t) => t.column === column.id).length}
									</Badge>
								</KanbanHeader>
								<KanbanCards id={column.id} className="gap-2 flex flex-col h-full overflow-y-auto px-0">
									{(item) => (
										<UnifiedTaskItem
											key={item.id}
											viewMode="kanban"
											task={item as unknown as schema.TaskWithLabels}
											columnId={column.id}
											onTaskClick={handleTaskClick}
											tasks={tasks}
											setTasks={setTasks}
											availableUsers={availableUsers}
											onTaskUpdate={handleTaskUpdate}
											categories={categories}
										/>
									)}
								</KanbanCards>
							</KanbanBoard>
						)}
					</KanbanProvider>
				)
			) : (
				<div className={cn("rounded h-full px-2", compact && "px-0")}>
					{groupedTasks.length > 0 ? (
						groupedTasks.map((group) => {
							const isCollapsed = collapsedSections.has(group.id);
							const hasSubGroups = group.subGroups && group.subGroups.length > 0;

							return (
								<div key={group.id} className="">
									<TaskGroupSectionHeader
										group={group}
										isCollapsed={isCollapsed}
										onToggleCollapse={() => handleToggleSection(group.id)}
										isSticky={true}
										compact={compact}
									/>

									{!isCollapsed && (
										<div className="py-1 flex flex-col gap-1">
											{hasSubGroups && group.subGroups ? (
												// Render with sub-groups
												group.subGroups.map((subGroup) => {
													const subGroupCollapsed = collapsedSections.has(subGroup.id);

													return (
														<div key={subGroup.id} className="">
															<TaskGroupSectionHeader
																group={subGroup}
																isCollapsed={subGroupCollapsed}
																onToggleCollapse={() => handleToggleSection(subGroup.id)}
																isSubGroup={true}
																className="py-1"
																rootClassName="bg-muted/0 hover:bg-muted/20 transition-all"
																compact={compact}
															/>
															{!subGroupCollapsed && (
																<div className="py-1 flex flex-col gap-1">
																	{subGroup.tasks.length > 0 ? (
																		subGroup.tasks.map((task) => (
																			<UnifiedTaskItem
																				viewMode="list"
																				key={`${subGroup.id}:${task.id}`}
																				task={task}
																				isSelected={selectedTasks.has(task.id)}
																				onSelect={(selected) => handleTaskSelect(task.id, selected)}
																				onTaskClick={handleTaskClick}
																				tasks={tasks}
																				setTasks={setTasks}
																				availableUsers={availableUsers}
																				onTaskUpdate={handleTaskUpdate}
																				categories={categories}
																				compact={compact}
																			/>
																		))
																	) : (
																		<div className="px-4 py-3 text-xs text-muted-foreground">
																			No tasks in this group
																		</div>
																	)}
																</div>
															)}
														</div>
													);
												})
											) : // Render without sub-groups (original behavior)
											group.tasks.length > 0 ? (
												group.tasks.map((task) => (
													<UnifiedTaskItem
														viewMode="list"
														key={`${group.id}:${task.id}`}
														task={task}
														isSelected={selectedTasks.has(task.id)}
														onSelect={(selected) => handleTaskSelect(task.id, selected)}
														onTaskClick={handleTaskClick}
														tasks={tasks}
														setTasks={setTasks}
														availableUsers={availableUsers}
														onTaskUpdate={handleTaskUpdate}
														categories={categories}
														compact={compact}
													/>
												))
											) : (
												<div className="px-4 py-3 text-xs text-muted-foreground">
													No tasks in this group
												</div>
											)}
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className="flex items-center justify-center">No issues found</div>
					)}
				</div>
			)}

			{selectedTask && (
				<TaskContent
					task={selectedTask}
					open={typeof taskContentOpen === "number"}
					onOpenChange={(value) => {
						if (!value) {
							setTaskContentOpen(0);
							setSelectedTask(null);
						}
					}}
					labels={labels}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					availableUsers={availableUsers}
					organization={organization}
					ws={ws}
					categories={categories}
					releases={releases}
				/>
			)}
		</div>
	);
}

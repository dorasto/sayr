"use client";

import { useState, useEffect, useCallback } from "react";
import type { schema } from "@repo/database";
import {
	Tile,
	TileAction,
	TileHeader,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import {
	IconArrowUpRight,
	IconGitBranch,
	IconLink,
	IconCopy,
	IconPlus,
	IconX,
} from "@tabler/icons-react";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import TaskPicker, { TaskPickerItem } from "../shared/task-picker";
import { statusConfig } from "../shared/config";
import {
	setTaskParentAction,
	removeTaskParentAction,
	getSubtasksAction,
	createTaskRelationAction,
	removeTaskRelationAction,
	getTaskRelationsAction,
} from "@/lib/fetches/task";
import type { useToastAction } from "@/lib/util";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";

interface HierarchySectionProps {
	task: schema.TaskWithLabels;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	wsClientId: string;
	runWithToast: typeof useToastAction extends () => { runWithToast: infer T } ? T : never;
}

/* -------------------------------------------------------------------------- */
/*                            Parent Task Section                             */
/* -------------------------------------------------------------------------- */

export function TaskParentSection({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	wsClientId,
	runWithToast,
}: HierarchySectionProps) {
	const [pickerOpen, setPickerOpen] = useState(false);

	const handleSetParent = async (parentTask: schema.TaskWithLabels) => {
		setPickerOpen(false);

		// Optimistic update
		const updatedTask = {
			...task,
			parentId: parentTask.id,
			parent: {
				id: parentTask.id,
				shortId: parentTask.shortId,
				title: parentTask.title,
				status: parentTask.status,
			},
		};
		setSelectedTask(updatedTask);
		setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

		const data = await runWithToast(
			"set-task-parent",
			{
				loading: { title: "Setting parent...", description: "Linking task to parent." },
				success: { title: "Parent set", description: "Task is now a subtask." },
				error: { title: "Failed", description: "Could not set parent task. Please try again." },
			},
			() => setTaskParentAction(task.organizationId, task.id, parentTask.id, wsClientId),
		);

		if (data?.success && data.data) {
			setSelectedTask(data.data);
			setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		}
	};

	const handleRemoveParent = async () => {
		const oldParent = task.parent;

		// Optimistic update
		const updatedTask = { ...task, parentId: null, parent: null };
		setSelectedTask(updatedTask);
		setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

		const data = await runWithToast(
			"remove-task-parent",
			{
				loading: { title: "Removing parent...", description: "Promoting to top-level task." },
				success: { title: "Parent removed", description: "Task is now a top-level task." },
				error: { title: "Failed", description: "Could not remove parent. Please try again." },
			},
			() => removeTaskParentAction(task.organizationId, task.id, wsClientId),
		);

		if (data?.success && data.data) {
			setSelectedTask(data.data);
			setTasks(tasks.map((t) => (t.id === task.id && data.data ? data.data : t)));
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		}
	};

	// Don't show parent picker if this task has subtasks (can't nest deeper)
	const hasSubtasks = (task.subtaskCount ?? 0) > 0;

	return (
		<div className="p-1 flex flex-col gap-2 max-w-full">
			<Tile className="md:w-full items-start p-0 flex-col gap-1" variant="transparent">
				<TileHeader>
					<TileTitle asChild>
						<Label variant="description" className="text-xs">
							Parent task
						</Label>
					</TileTitle>
				</TileHeader>
				<TileAction>
					{task.parent ? (
						<div className="flex items-center gap-1 group/parent w-full">
							<div className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-0.5 hover:bg-accent cursor-pointer">
								<TaskPickerItem task={task.parent} />
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 opacity-0 group-hover/parent:opacity-100 shrink-0"
								onClick={handleRemoveParent}
							>
								<IconX className="h-3 w-3" />
							</Button>
						</div>
					) : hasSubtasks ? (
						<span className="text-xs text-muted-foreground px-1">
							Has subtasks (cannot be nested)
						</span>
					) : (
						<TaskPicker
							tasks={tasks}
							onSelect={handleSetParent}
							excludeIds={[task.id]}
							filter={(t) => !t.parentId}
							searchPlaceholder="Search for parent task..."
							placeholder="Set parent task"
							open={pickerOpen}
							onOpenChange={setPickerOpen}
							customTrigger={
								<Button variant="ghost" size="sm" className="h-auto py-0.5 px-1 text-muted-foreground gap-1">
									<IconPlus className="h-3 w-3" />
									<span className="text-xs">Set parent</span>
								</Button>
							}
						/>
					)}
				</TileAction>
			</Tile>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                           Subtasks Section                                 */
/* -------------------------------------------------------------------------- */

export function TaskSubtasksSection({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	wsClientId,
	runWithToast,
}: HierarchySectionProps) {
	const [subtasks, setSubtasks] = useState<schema.SubtaskSummary[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// Fetch subtasks when component mounts or subtaskCount changes
	const fetchSubtasks = useCallback(async () => {
		if ((task.subtaskCount ?? 0) === 0) {
			setSubtasks([]);
			return;
		}
		setLoading(true);
		try {
			const result = await getSubtasksAction(task.organizationId, task.id);
			if (result.success && result.data) {
				setSubtasks(result.data);
			}
		} finally {
			setLoading(false);
		}
	}, [task.organizationId, task.id, task.subtaskCount]);

	useEffect(() => {
		fetchSubtasks();
	}, [fetchSubtasks]);

	const handleAddSubtask = async (childTask: schema.TaskWithLabels) => {
		setPickerOpen(false);

		// Optimistic: add to local subtask list
		const newSubtask: schema.SubtaskSummary = {
			id: childTask.id,
			shortId: childTask.shortId,
			title: childTask.title,
			status: childTask.status,
			priority: childTask.priority,
			assignees: childTask.assignees,
		};
		setSubtasks((prev) => [...prev, newSubtask]);

		// Optimistic: update parent's subtaskCount
		const updatedTask = { ...task, subtaskCount: (task.subtaskCount ?? 0) + 1 };
		setSelectedTask(updatedTask);
		setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

		const data = await runWithToast(
			"add-subtask",
			{
				loading: { title: "Adding subtask...", description: "Linking task as subtask." },
				success: { title: "Subtask added", description: "Task is now a subtask." },
				error: { title: "Failed", description: "Could not add subtask. Please try again." },
			},
			() => setTaskParentAction(task.organizationId, childTask.id, task.id, wsClientId),
		);

		if (data?.success) {
			// Refetch to get accurate data
			fetchSubtasks();
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		} else {
			// Revert optimistic update
			setSubtasks((prev) => prev.filter((s) => s.id !== childTask.id));
			setSelectedTask(task);
			setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
		}
	};

	const handleRemoveSubtask = async (subtaskId: string) => {
		// Optimistic: remove from local list
		const removedSubtask = subtasks.find((s) => s.id === subtaskId);
		setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

		const updatedTask = { ...task, subtaskCount: Math.max(0, (task.subtaskCount ?? 0) - 1) };
		setSelectedTask(updatedTask);
		setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));

		const data = await runWithToast(
			"remove-subtask",
			{
				loading: { title: "Removing subtask...", description: "Promoting task to top-level." },
				success: { title: "Subtask removed", description: "Task is now a top-level task." },
				error: { title: "Failed", description: "Could not remove subtask. Please try again." },
			},
			() => removeTaskParentAction(task.organizationId, subtaskId, wsClientId),
		);

		if (data?.success) {
			fetchSubtasks();
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		} else if (removedSubtask) {
			// Revert optimistic update
			setSubtasks((prev) => [...prev, removedSubtask]);
			setSelectedTask(task);
			setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
		}
	};

	// If this task is a subtask itself, it can't have subtasks (single-level)
	if (task.parentId) {
		return null;
	}

	const subtaskIds = subtasks.map((s) => s.id);

	return (
		<div className="p-1 flex flex-col gap-2 max-w-full">
			<Tile className="md:w-full items-start p-0 flex-col gap-1" variant="transparent">
				<TileHeader>
					<TileTitle asChild>
						<Label variant="description" className="text-xs">
							Subtasks{subtasks.length > 0 ? ` (${subtasks.length})` : ""}
						</Label>
					</TileTitle>
				</TileHeader>
				<TileAction>
					<div className="flex flex-col gap-0.5 w-full">
						{subtasks.map((subtask) => (
							<div
								key={subtask.id}
								className="flex items-center gap-1 group/subtask w-full"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-0.5 hover:bg-accent cursor-pointer">
									<TaskPickerItem task={subtask} />
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 opacity-0 group-hover/subtask:opacity-100 shrink-0"
									onClick={() => handleRemoveSubtask(subtask.id)}
								>
									<IconX className="h-3 w-3" />
								</Button>
							</div>
						))}
						<TaskPicker
							tasks={tasks}
							onSelect={handleAddSubtask}
							excludeIds={[task.id, ...subtaskIds]}
							filter={(t) => !t.parentId && (t.subtaskCount ?? 0) === 0}
							searchPlaceholder="Search for task to add as subtask..."
							placeholder="Add subtask"
							open={pickerOpen}
							onOpenChange={setPickerOpen}
							customTrigger={
								<Button variant="ghost" size="sm" className="h-auto py-0.5 px-1 text-muted-foreground gap-1">
									<IconPlus className="h-3 w-3" />
									<span className="text-xs">Add subtask</span>
								</Button>
							}
						/>
					</div>
				</TileAction>
			</Tile>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/*                          Relations Section                                 */
/* -------------------------------------------------------------------------- */

const RELATION_TYPE_LABELS: Record<string, { sourceLabel: string; targetLabel: string; icon: React.ReactNode }> = {
	blocking: {
		sourceLabel: "Blocking",
		targetLabel: "Blocked by",
		icon: <IconArrowUpRight className="h-3 w-3 text-destructive" />,
	},
	related: {
		sourceLabel: "Related to",
		targetLabel: "Related to",
		icon: <IconLink className="h-3 w-3 text-muted-foreground" />,
	},
	duplicate: {
		sourceLabel: "Duplicate of",
		targetLabel: "Duplicated by",
		icon: <IconCopy className="h-3 w-3 text-muted-foreground" />,
	},
};

export function TaskRelationsSection({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	wsClientId,
	runWithToast,
}: HierarchySectionProps) {
	const [relations, setRelations] = useState<schema.TaskRelationWithTarget[]>([]);
	const [loading, setLoading] = useState(false);
	const [addingType, setAddingType] = useState<"related" | "blocking" | "duplicate" | null>(null);
	const [typePickerOpen, setTypePickerOpen] = useState(false);

	const fetchRelations = useCallback(async () => {
		setLoading(true);
		try {
			const result = await getTaskRelationsAction(task.organizationId, task.id);
			if (result.success && result.data) {
				setRelations(result.data);
			}
		} finally {
			setLoading(false);
		}
	}, [task.organizationId, task.id]);

	useEffect(() => {
		fetchRelations();
	}, [fetchRelations]);

	const handleAddRelation = async (targetTask: schema.TaskWithLabels) => {
		if (!addingType) return;
		const type = addingType;
		setAddingType(null);

		const data = await runWithToast(
			"add-task-relation",
			{
				loading: { title: "Adding relation...", description: `Linking tasks as ${type}.` },
				success: { title: "Relation added", description: "Tasks are now linked." },
				error: { title: "Failed", description: "Could not add relation. Please try again." },
			},
			() => createTaskRelationAction(task.organizationId, task.id, targetTask.id, type, wsClientId),
		);

		if (data?.success) {
			fetchRelations();
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		}
	};

	const handleRemoveRelation = async (relation: schema.TaskRelationWithTarget) => {
		// Optimistic: remove from local list
		setRelations((prev) => prev.filter((r) => r.id !== relation.id));

		// Determine source and target IDs for the backend
		const sourceTaskId = relation.direction === "source" ? task.id : relation.task.id;
		const targetTaskId = relation.direction === "source" ? relation.task.id : task.id;

		const data = await runWithToast(
			"remove-task-relation",
			{
				loading: { title: "Removing relation...", description: "Unlinking tasks." },
				success: { title: "Relation removed", description: "Tasks are no longer linked." },
				error: { title: "Failed", description: "Could not remove relation. Please try again." },
			},
			() => removeTaskRelationAction(task.organizationId, relation.id, sourceTaskId, targetTaskId, wsClientId),
		);

		if (data?.success) {
			fetchRelations();
			sendWindowMessage(window, { type: "timeline-update", payload: task.id }, "*");
		} else {
			// Revert
			fetchRelations();
		}
	};

	const getRelationLabel = (relation: schema.TaskRelationWithTarget) => {
		const config = RELATION_TYPE_LABELS[relation.type];
		if (!config) return relation.type;
		return relation.direction === "source" ? config.sourceLabel : config.targetLabel;
	};

	const getRelationIcon = (relation: schema.TaskRelationWithTarget) => {
		return RELATION_TYPE_LABELS[relation.type]?.icon ?? null;
	};

	// Existing relation target IDs (to prevent duplicates)
	const existingRelationIds = relations.map((r) => r.task.id);

	return (
		<div className="p-1 flex flex-col gap-2 max-w-full">
			<Tile className="md:w-full items-start p-0 flex-col gap-1" variant="transparent">
				<TileHeader>
					<TileTitle asChild>
						<Label variant="description" className="text-xs">
							Relations{relations.length > 0 ? ` (${relations.length})` : ""}
						</Label>
					</TileTitle>
				</TileHeader>
				<TileAction>
					<div className="flex flex-col gap-0.5 w-full">
						{relations.map((relation) => (
							<div
								key={relation.id}
								className="flex items-center gap-1 group/relation w-full"
							>
								<div className="flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-0.5 hover:bg-accent cursor-pointer">
									{getRelationIcon(relation)}
									<span className="text-xs text-muted-foreground shrink-0">
										{getRelationLabel(relation)}
									</span>
									<TaskPickerItem
										task={relation.task}
										className="flex-1"
									/>
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-5 w-5 opacity-0 group-hover/relation:opacity-100 shrink-0"
									onClick={() => handleRemoveRelation(relation)}
								>
									<IconX className="h-3 w-3" />
								</Button>
							</div>
						))}

						{/* Add relation flow: 1) pick type, 2) pick task */}
						{addingType ? (
							<TaskPicker
								tasks={tasks}
								onSelect={handleAddRelation}
								excludeIds={[task.id, ...existingRelationIds]}
								searchPlaceholder={`Search for task to link as ${addingType}...`}
								placeholder="Select task"
								open={true}
								onOpenChange={(open) => {
									if (!open) setAddingType(null);
								}}
								customTrigger={
									<Button variant="ghost" size="sm" className="h-auto py-0.5 px-1 text-muted-foreground gap-1">
										<IconPlus className="h-3 w-3" />
										<span className="text-xs">Select {addingType} task...</span>
									</Button>
								}
							/>
						) : (
							<ComboBox
								value=""
								onValueChange={(val) => {
									if (val === "related" || val === "blocking" || val === "duplicate") {
										setAddingType(val);
									}
									setTypePickerOpen(false);
								}}
								open={typePickerOpen}
								onOpenChange={setTypePickerOpen}
							>
								<ComboBoxTrigger asChild>
									<Button variant="ghost" size="sm" className="h-auto py-0.5 px-1 text-muted-foreground gap-1">
										<IconPlus className="h-3 w-3" />
										<span className="text-xs">Add relation</span>
									</Button>
								</ComboBoxTrigger>
								<ComboBoxContent>
									<ComboBoxList>
										<ComboBoxGroup>
											<ComboBoxItem value="blocking" searchValue="blocking blocks">
												<div className="flex items-center gap-2">
													<IconArrowUpRight className="h-4 w-4 text-destructive" />
													<span>Blocking</span>
												</div>
											</ComboBoxItem>
											<ComboBoxItem value="related" searchValue="related">
												<div className="flex items-center gap-2">
													<IconLink className="h-4 w-4 text-muted-foreground" />
													<span>Related to</span>
												</div>
											</ComboBoxItem>
											<ComboBoxItem value="duplicate" searchValue="duplicate">
												<div className="flex items-center gap-2">
													<IconCopy className="h-4 w-4 text-muted-foreground" />
													<span>Duplicate of</span>
												</div>
											</ComboBoxItem>
										</ComboBoxGroup>
									</ComboBoxList>
								</ComboBoxContent>
							</ComboBox>
						)}
					</div>
				</TileAction>
			</Tile>
		</div>
	);
}

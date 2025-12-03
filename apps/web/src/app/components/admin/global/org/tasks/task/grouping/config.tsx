"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { IconCategory2, IconUser } from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "../../../shared/task-config";
import type { TaskGroup, TaskGroupingContext, TaskGroupingDefinition, TaskGroupingId } from "./types";

const STATUS_ORDER: Array<keyof typeof statusConfig> = ["backlog", "todo", "in-progress", "done", "canceled"];
const PRIORITY_ORDER: Array<keyof typeof priorityConfig> = ["urgent", "high", "medium", "low", "none"];
const COMPLETED_STATUSES: Array<keyof typeof statusConfig> = ["done", "canceled"];

const filterCompletedTasks = (tasks: schema.TaskWithLabels[], showCompletedTasks: boolean): schema.TaskWithLabels[] => {
	if (showCompletedTasks) return tasks;
	return tasks.filter((task) => !COMPLETED_STATUSES.includes(task.status as keyof typeof statusConfig));
};

const createInitialStatusGroups = () =>
	STATUS_ORDER.map((statusKey) => {
		const config = statusConfig[statusKey];
		return {
			id: `status:${statusKey}`,
			key: statusKey,
			label: config.label,
			count: 0,
			tasks: [] as schema.TaskWithLabels[],
			icon: config.icon("h-4 w-4"),
			description: undefined,
			accentClassName: config.className,
		};
	});

const createInitialPriorityGroups = () =>
	PRIORITY_ORDER.map((priorityKey) => {
		const config = priorityConfig[priorityKey];
		return {
			id: `priority:${priorityKey}`,
			key: priorityKey,
			label: config.label,
			count: 0,
			tasks: [] as schema.TaskWithLabels[],
			icon: config.icon("h-4 w-4"),
			description: undefined,
			accentClassName: config.className,
		};
	});

type AssigneeDisplay = {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
};

const getUserInitials = (user: AssigneeDisplay | undefined) => {
	const source = user?.name || user?.email || "";
	if (!source) return "?";
	return source
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
};

const createAssigneeGroup = (user: AssigneeDisplay | undefined) => {
	const id = user ? `assignee:${user.id}` : "assignee:unassigned";
	const label = user?.name || user?.email || "Unassigned";
	return {
		id,
		key: user?.id || "unassigned",
		label,
		count: 0,
		tasks: [] as schema.TaskWithLabels[],
		icon: user ? (
			<Avatar className="h-4 w-4 border border-border">
				<AvatarImage src={user.image || undefined} />
				<AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
			</Avatar>
		) : (
			<div className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
				<IconUser className="h-4 w-4" />
			</div>
		),
		description: undefined,
		accentClassName: undefined,
		metadata: user ? { user } : undefined,
	};
};

const statusGrouping = createGroupingDefinition("status", {
	label: "Status",
	description: "Group tasks by their workflow status",
	icon: statusConfig.todo.icon("h-4 w-4"),
	group: ({ tasks, showEmptyGroups, showCompletedTasks }: TaskGroupingContext) => {
		const filteredTasks = filterCompletedTasks(tasks, showCompletedTasks);
		const groups = createInitialStatusGroups();
		const fallbackGroup = groups[0];
		if (!fallbackGroup) {
			return [];
		}

		filteredTasks.forEach((task) => {
			const statusKey = (task.status as keyof typeof statusConfig) || fallbackGroup.key;
			const target = groups.find((g) => g.key === statusKey) ?? fallbackGroup;
			target.tasks.push(task);
		});

		return groups
			.map((group) => ({ ...group, count: group.tasks.length }))
			.filter((group) => {
				// Hide completed status groups when showCompletedTasks is false
				if (!showCompletedTasks && COMPLETED_STATUSES.includes(group.key as keyof typeof statusConfig)) {
					return false;
				}
				return showEmptyGroups ? true : group.tasks.length > 0;
			});
	},
});

const priorityGrouping = createGroupingDefinition("priority", {
	label: "Priority",
	description: "Group tasks by priority level",
	icon: priorityConfig.medium.icon("h-4 w-4"),
	group: ({ tasks, showEmptyGroups, showCompletedTasks }: TaskGroupingContext) => {
		const filteredTasks = filterCompletedTasks(tasks, showCompletedTasks);
		const groups = createInitialPriorityGroups();
		const fallbackGroup = groups.find((group) => group.key === "none") ?? groups[0];
		if (!fallbackGroup) {
			return [];
		}

		filteredTasks.forEach((task) => {
			const priorityKey = (task.priority as keyof typeof priorityConfig) || fallbackGroup.key;
			const target = groups.find((g) => g.key === priorityKey) ?? fallbackGroup;
			target.tasks.push(task);
		});

		return groups
			.map((group) => ({ ...group, count: group.tasks.length }))
			.filter((group) => (showEmptyGroups ? true : group.tasks.length > 0));
	},
});

const assigneeGrouping = createGroupingDefinition("assignee", {
	label: "Assignee",
	description: "Group tasks by assigned team members",
	icon: <IconUser className="h-4 w-4" />,
	group: ({ tasks, availableUsers, showEmptyGroups, showCompletedTasks }: TaskGroupingContext) => {
		const filteredTasks = filterCompletedTasks(tasks, showCompletedTasks);
		const groupMap = new Map<string, TaskGroup>();

		const ensureGroupForUser = (user: AssigneeDisplay | undefined) => {
			const key = user?.id || "unassigned";
			const existing = groupMap.get(key);
			if (existing) {
				return existing;
			}
			const created = createAssigneeGroup(user);
			groupMap.set(key, created);
			return created;
		};

		if (showEmptyGroups) {
			availableUsers.forEach((user) => {
				ensureGroupForUser(user);
			});
			ensureGroupForUser(undefined);
		}

		filteredTasks.forEach((task) => {
			if (task.assignees && task.assignees.length > 0) {
				task.assignees.forEach((assignee) => {
					const matchingUser = availableUsers.find((user) => user.id === assignee.id);
					const fallbackUser: AssigneeDisplay = {
						id: assignee.id,
						name: assignee.name,
						image: assignee.image,
					};
					const group = ensureGroupForUser(matchingUser ?? fallbackUser);
					group.tasks.push(task);
				});
			} else {
				const unassignedGroup = ensureGroupForUser(undefined);
				unassignedGroup.tasks.push(task);
			}
		});

		const groups = Array.from(groupMap.values()).map((group) => ({ ...group, count: group.tasks.length }));

		return groups
			.sort((a, b) => {
				if (a.key === "unassigned") return 1;
				if (b.key === "unassigned") return -1;
				return a.label.localeCompare(b.label);
			})
			.filter((group) => (showEmptyGroups ? true : group.tasks.length > 0));
	},
});
const createCategoryGroup = (category?: schema.categoryType | null): TaskGroup => {
	const key = category?.id || "uncategorized";
	const id = category?.id ? `category:${category.id}` : "category:none";
	return {
		id,
		key,
		label: category?.name || "No category",
		icon: <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: category?.color || "#cccccc" }} />,
		tasks: [],
		count: 0,
	};
};
export const categoryGrouping = createGroupingDefinition("category", {
	label: "Category",
	description: "Group tasks by categories",
	icon: <IconCategory2 className="h-4 w-4" />,
	group: ({ tasks, showEmptyGroups, showCompletedTasks, categories }: TaskGroupingContext) => {
		const filteredTasks = filterCompletedTasks(tasks, showCompletedTasks);
		const groupMap = new Map<string, TaskGroup>();

		// Safely create or retrieve a group without using non-null assertions
		const ensureGroupForCategory = (category?: schema.categoryType | null): TaskGroup => {
			const key = category?.id || "uncategorized";
			const existingGroup = groupMap.get(key);
			if (existingGroup) {
				return existingGroup;
			}
			const newGroup = createCategoryGroup(category);
			groupMap.set(key, newGroup);
			return newGroup;
		};

		// Optionally pre-create groups for all categories (for "show empty" mode)
		if (showEmptyGroups) {
			categories.forEach((cat) => ensureGroupForCategory(cat));
			ensureGroupForCategory(null); // Uncategorized
		}

		// Assign each task to a category-based group
		filteredTasks.forEach((task) => {
			// Handle both string-based and object-based category fields
			let category: schema.categoryType | null = null;
			if (typeof task.category === "string") {
				category = categories.find((c) => c.id === task.category) ?? null;
			} else if (task.category && typeof task.category === "object") {
				category = task.category as schema.categoryType;
			}

			const group = ensureGroupForCategory(category);
			group.tasks.push(task);
		});

		// Compute counts for all groups
		const groups = Array.from(groupMap.values()).map((group) => ({
			...group,
			count: group.tasks.length,
		}));

		// Sort alphabetically, with "No category" last
		return groups
			.sort((a, b) => {
				if (a.key === "uncategorized") return 1;
				if (b.key === "uncategorized") return -1;
				return a.label.localeCompare(b.label);
			})
			.filter((group) => (showEmptyGroups ? true : group.tasks.length > 0));
	},
});
function createGroupingDefinition(
	id: TaskGroupingId,
	definition: Omit<TaskGroupingDefinition, "id">
): TaskGroupingDefinition {
	return {
		id,
		...definition,
	};
}

export const TASK_GROUPINGS: Record<TaskGroupingId, TaskGroupingDefinition> = {
	status: statusGrouping,
	priority: priorityGrouping,
	assignee: assigneeGrouping,
	category: categoryGrouping,
};

export const TASK_GROUPING_OPTIONS: TaskGroupingDefinition[] = Object.values(TASK_GROUPINGS);

export const DEFAULT_STATUS_ORDER = STATUS_ORDER;
export const DEFAULT_PRIORITY_ORDER = PRIORITY_ORDER;

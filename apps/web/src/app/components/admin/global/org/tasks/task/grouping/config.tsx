"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { IconUser } from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "../../../shared/task-config";
import type { TaskGroup, TaskGroupingContext, TaskGroupingDefinition, TaskGroupingId } from "./types";

const STATUS_ORDER: Array<keyof typeof statusConfig> = ["backlog", "todo", "in-progress", "done", "canceled"];
const PRIORITY_ORDER: Array<keyof typeof priorityConfig> = ["urgent", "high", "medium", "low", "none"];

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
	group: ({ tasks, showEmptyGroups }: TaskGroupingContext) => {
		const groups = createInitialStatusGroups();
		const fallbackGroup = groups[0];
		if (!fallbackGroup) {
			return [];
		}

		tasks.forEach((task) => {
			const statusKey = (task.status as keyof typeof statusConfig) || fallbackGroup.key;
			const target = groups.find((g) => g.key === statusKey) ?? fallbackGroup;
			target.tasks.push(task);
		});

		return groups
			.map((group) => ({ ...group, count: group.tasks.length }))
			.filter((group) => (showEmptyGroups ? true : group.tasks.length > 0));
	},
});

const priorityGrouping = createGroupingDefinition("priority", {
	label: "Priority",
	description: "Group tasks by priority level",
	icon: priorityConfig.medium.icon("h-4 w-4"),
	group: ({ tasks, showEmptyGroups }: TaskGroupingContext) => {
		const groups = createInitialPriorityGroups();
		const fallbackGroup = groups.find((group) => group.key === "none") ?? groups[0];
		if (!fallbackGroup) {
			return [];
		}

		tasks.forEach((task) => {
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
	group: ({ tasks, availableUsers, showEmptyGroups }: TaskGroupingContext) => {
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

		tasks.forEach((task) => {
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
};

export const TASK_GROUPING_OPTIONS: TaskGroupingDefinition[] = Object.values(TASK_GROUPINGS);

export const DEFAULT_STATUS_ORDER = STATUS_ORDER;
export const DEFAULT_PRIORITY_ORDER = PRIORITY_ORDER;

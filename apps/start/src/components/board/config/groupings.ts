import type { schema } from "@repo/database";
import type { ReactNode } from "react";
import type { TaskGroupingId } from "../filter/types";
import type { PriorityValue, StatusValue } from "./field-config";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "./field-config";

export const UNASSIGNED_GROUP_ID = "__unassigned__";
export const UNCATEGORIZED_GROUP_ID = "__uncategorized__";
export const NO_RELEASE_GROUP_ID = "__no_release__";

export interface BoardTaskGroup {
	id: string;
	label: string;
	icon?: ReactNode;
	tasks: schema.TaskWithLabels[];
	subGroups?: BoardTaskGroup[];
}

export interface BoardGroupingOptions {
	categories?: schema.categoryType[];
	releases?: schema.releaseType[];
}

function createGroup(id: string, label: string, tasks: schema.TaskWithLabels[], icon?: ReactNode): BoardTaskGroup {
	return { id, label, icon, tasks };
}

function groupByAssignee(tasks: schema.TaskWithLabels[]): BoardTaskGroup[] {
	const assignees = new Map<string, schema.UserSummary>();
	for (const task of tasks) {
		for (const assignee of task.assignees) {
			assignees.set(assignee.id, assignee);
		}
	}

	return [
		...Array.from(assignees.values()).map((assignee) =>
			createGroup(
				assignee.id,
				assignee.name ?? "Unknown user",
				tasks.filter((task) => task.assignees.some((taskAssignee) => taskAssignee.id === assignee.id))
			)
		),
		createGroup(
			UNASSIGNED_GROUP_ID,
			"Unassigned",
			tasks.filter((task) => task.assignees.length === 0)
		),
	];
}

function groupByCategory(tasks: schema.TaskWithLabels[], categories: schema.categoryType[]): BoardTaskGroup[] {
	const categoriesById = new Map(categories.map((category) => [category.id, category]));
	const knownCategoryGroups = categories.map((category) =>
		createGroup(
			category.id,
			category.name,
			tasks.filter((task) => task.category === category.id)
		)
	);
	const uncategorizedTasks = tasks.filter((task) => !task.category || !categoriesById.has(task.category));

	return [...knownCategoryGroups, createGroup(UNCATEGORIZED_GROUP_ID, "Uncategorized", uncategorizedTasks)];
}

function groupByRelease(tasks: schema.TaskWithLabels[], releases: schema.releaseType[]): BoardTaskGroup[] {
	const releasesById = new Map(releases.map((release) => [release.id, release]));
	const knownReleaseGroups = releases.map((release) =>
		createGroup(
			release.id,
			release.name,
			tasks.filter((task) => task.releaseId === release.id)
		)
	);
	const noReleaseTasks = tasks.filter((task) => !task.releaseId || !releasesById.has(task.releaseId));

	return [...knownReleaseGroups, createGroup(NO_RELEASE_GROUP_ID, "No release", noReleaseTasks)];
}

/** Groups board tasks without importing the retired task-view system. */
export function groupTasks(
	tasks: schema.TaskWithLabels[],
	groupBy: TaskGroupingId,
	{ categories = [], releases = [] }: BoardGroupingOptions = {}
): BoardTaskGroup[] {
	switch (groupBy) {
		case "status":
			return (Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => {
				const config = STATUS_CONFIG[status];
				return createGroup(
					status,
					config.label,
					tasks.filter((task) => task.status === status),
					config.icon("h-4 w-4")
				);
			});
		case "priority":
			return (Object.keys(PRIORITY_CONFIG) as PriorityValue[]).map((priority) => {
				const config = PRIORITY_CONFIG[priority];
				return createGroup(
					priority,
					config.label,
					tasks.filter((task) => task.priority === priority),
					config.icon("h-4 w-4")
				);
			});
		case "assignee":
			return groupByAssignee(tasks);
		case "category":
			return groupByCategory(tasks, categories);
		case "release":
			return groupByRelease(tasks, releases);
	}
}

/** Applies one optional subgrouping level for the list and kanban board views. */
export function applyNestedGrouping(
	tasks: schema.TaskWithLabels[],
	groupBy: TaskGroupingId,
	subGroupBy: TaskGroupingId | "none",
	options: BoardGroupingOptions = {}
): BoardTaskGroup[] {
	return groupTasks(tasks, groupBy, options).map((group) => ({
		...group,
		subGroups: subGroupBy === "none" ? undefined : groupTasks(group.tasks, subGroupBy, options),
	}));
}

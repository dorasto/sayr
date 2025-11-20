import type { schema } from "@repo/database";
import type { ReactNode } from "react";

export type TaskGroupingId = "status" | "assignee" | "priority" | "category";

export interface TaskGroup {
	id: string;
	key: string;
	label: string;
	count: number;
	tasks: schema.TaskWithLabels[];
	icon?: ReactNode;
	description?: string;
	accentClassName?: string;
	metadata?: Record<string, unknown>;
}

export interface TaskGroupingContext {
	tasks: schema.TaskWithLabels[];
	availableUsers: schema.userType[];
	showEmptyGroups: boolean;
	categories: schema.categoryType[];
}

export interface TaskGroupingDefinition {
	id: TaskGroupingId;
	label: string;
	description?: string;
	icon: ReactNode;
	group: (context: TaskGroupingContext) => TaskGroup[];
}

export interface TaskViewState {
	grouping: TaskGroupingId;
	showEmptyGroups: boolean;
}

export const TASK_VIEW_STATE_KEY = "task-view";

export const DEFAULT_TASK_VIEW_STATE: TaskViewState = {
	grouping: "status",
	showEmptyGroups: true,
};

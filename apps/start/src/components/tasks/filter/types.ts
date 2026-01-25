import type { schema } from "@repo/database";
import type { ReactNode } from "react";

export type TaskGroupingId = "status" | "assignee" | "priority" | "category" | "release";

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
	showCompletedTasks: boolean;
	categories: schema.categoryType[];
	releases: schema.releaseType[];
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
	subGrouping?: TaskGroupingId | "none";
	showCompletedTasks: boolean;
	viewMode: "list" | "kanban";
}

export const TASK_VIEW_STATE_KEY = "task-view";

export const DEFAULT_TASK_VIEW_STATE: TaskViewState = {
	grouping: "status",
	subGrouping: "none",
	showCompletedTasks: false,
	viewMode: "list",
};
// Clean-slate operator set
export type FilterOperator =
	| "any" // overlap (selected ∩ field != ∅)
	| "all" // selected ⊆ field
	| "none" // disjoint
	| "exact" // sets identical
	| "contains" // text substring
	| "not_contains" // text substring negation
	| "before"
	| "after"
	| "between"
	| "empty"
	| "not_empty";

export type FilterField =
	| "status"
	| "priority"
	| "assignee"
	| "label"
	| "creator"
	| "created_at"
	| "updated_at"
	| "title"
	| "category"
	| "release";

export interface DateRangeValue {
	start: string;
	end: string;
}

export type FilterValue = string | string[] | DateRangeValue | null;

export interface FilterCondition {
	id: string;
	field: FilterField;
	operator: FilterOperator;
	value: FilterValue;
	label?: string; // Display label for the filter
}

export interface FilterGroup {
	id: string;
	conditions: FilterCondition[];
	operator: "AND" | "OR";
}

export interface FilterState {
	groups: FilterGroup[];
	operator: "AND" | "OR"; // Between groups
}

export interface FilterOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
	color?: string;
	description?: string;
	image?: string;
}

export interface FilterFieldConfig {
	field: FilterField;
	label: string;
	icon?: React.ReactNode;
	operators: FilterOperator[]; // Allowed operators
	filterDefault: FilterOperator; // Default operator when user adds a condition
	multi?: boolean; // If true, value may become string[] for (any, all, none, exact)
	empty?: string; // Human label for empty option
	getOptions?: (
		tasks: schema.TaskWithLabels[],
		labels: schema.labelType[],
		users: schema.userType[],
		subSearch: string,
		categories: schema.categoryType[],
		releases: schema.releaseType[]
	) => FilterOption[];
	renderValue?: (condition: FilterCondition) => React.ReactNode;
}

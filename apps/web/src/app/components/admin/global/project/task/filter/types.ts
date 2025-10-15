import type { schema } from "@repo/database";

export type FilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "in"
	| "not_in"
	| "before"
	| "after"
	| "between"
	| "is_empty"
	| "is_not_empty";

export type FilterField =
	| "status"
	| "priority"
	| "assignee"
	| "label"
	| "creator"
	| "created_at"
	| "updated_at"
	| "title";

export interface FilterCondition {
	id: string;
	field: FilterField;
	operator: FilterOperator;
	value: string | string[] | Date | null;
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
	operators: FilterOperator[];
	filterDefault: FilterOperator;
	multi?: boolean; // Whether multiple values can be managed inside a single condition (uses value as string[] for in/not_in)
	empty?: string;
	getOptions?: (
		tasks: schema.TaskWithLabels[],
		labels: schema.labelType[],
		users: schema.userType[],
		subSearch: string
	) => FilterOption[];
	renderValue?: (condition: FilterCondition) => React.ReactNode;
}

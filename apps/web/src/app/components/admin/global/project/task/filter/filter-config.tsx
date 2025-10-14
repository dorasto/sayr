import type { schema } from "@repo/database";
import { IconCalendar, IconTag, IconTextSize, IconUser } from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "../../shared/task-config";
import type { FilterCondition, FilterFieldConfig, FilterOperator, FilterState } from "./types";

// Convert status config to filter options
const STATUS_OPTIONS = Object.entries(statusConfig).map(([value, config]) => ({
	value,
	label: config.label,
	color: config.color,
	icon: config.icon("w-3 h-3"),
}));

const PRIORITY_OPTIONS = Object.entries(priorityConfig).map(([value, config]) => ({
	value,
	label: config.label,
	color: config.color,
	icon: config.icon("w-3 h-3"),
}));

export const FILTER_FIELD_CONFIGS: FilterFieldConfig[] = [
	{
		field: "status",
		label: "Status",
		icon: statusConfig.todo.icon("w-4 h-4"), // Use a representative status icon
		operators: ["equals", "not_equals", "in", "not_in"],
		filterDefault: "equals",
		getOptions: (_tasks, _labels, _users, subSearch) => {
			return STATUS_OPTIONS.filter((option) => option.label.toLowerCase().includes(subSearch?.toLowerCase() || ""));
		},
	},
	{
		field: "priority",
		label: "Priority",
		icon: priorityConfig.medium.icon("w-4 h-4"), // Use a representative priority icon
		operators: ["equals", "not_equals", "in", "not_in"],
		filterDefault: "equals",
		getOptions: (_tasks, _labels, _users, subSearch) => {
			return PRIORITY_OPTIONS.filter((option) =>
				option.label.toLowerCase().includes(subSearch?.toLowerCase() || "")
			);
		},
	},
	{
		field: "assignee",
		label: "Assignee",
		icon: <IconUser className="w-4 h-4" />,
		operators: ["equals", "not_equals", "in", "not_in", "is_empty", "is_not_empty"],
		filterDefault: "equals",
		empty: "Unassigned",
		getOptions: (tasks, _labels, users, subSearch) => {
			const ids = new Set<string>();
			tasks.forEach((t) => t.assignees?.forEach((a) => ids.add(a.id)));
			const q = subSearch.toLowerCase();
			return users
				.filter((u) => ids.has(u.id) && (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)))
				.map((u) => ({
					value: u.id,
					label: u.name || "Unknown User",
					image: u.image || "",
				}));
		},
	},
	{
		field: "label",
		label: "Label",
		icon: <IconTag className="w-4 h-4" />,
		operators: ["equals", "not_equals", "in", "not_in", "is_empty", "is_not_empty"],
		filterDefault: "in",
		empty: "No labels",
		getOptions: (_tasks, labels, _users, subSearch) => {
			const q = subSearch.toLowerCase();
			return labels
				.filter((f) => f.name?.toLowerCase().includes(q))
				.map((label) => ({
					value: label.id,
					label: label.name,
					color: label.color || "#cccccc",
				}));
		},
	},
	{
		field: "creator",
		label: "Creator",
		icon: <IconUser className="w-4 h-4" />,
		operators: ["equals", "not_equals", "in", "not_in", "is_empty", "is_not_empty"],
		filterDefault: "equals",
		getOptions: (_tasks, _labels, users, subSearch) => {
			const q = subSearch.toLowerCase();
			return users
				.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
				.map((u) => ({
					value: u.id,
					label: u.name || "Unknown User",
					image: u.image || "",
				}));
		},
	},
	{
		field: "created_at",
		label: "Created",
		icon: <IconCalendar className="w-4 h-4" />,
		operators: ["before", "after", "between"],
		filterDefault: "between",
	},
	{
		field: "updated_at",
		label: "Updated",
		icon: <IconCalendar className="w-4 h-4" />,
		operators: ["before", "after", "between"],
		filterDefault: "between",
	},
	{
		field: "title",
		label: "Title",
		icon: <IconTextSize className="w-4 h-4" />,
		operators: ["contains", "not_contains"],
		filterDefault: "contains",
		getOptions(tasks, _labels, _users, subSearch) {
			const q = subSearch.toLowerCase();
			const uniqueTitle = new Set<string>();
			tasks
				.filter((task) => task.title?.toLowerCase().includes(q))
				.forEach((task) => {
					if (task.title) uniqueTitle.add(task.title.toLowerCase());
				});
			return Array.from(uniqueTitle).map((title) => ({
				value: title,
				label: title,
			}));
		},
	},
];

// Filter application logic
export function applyFilters(tasks: schema.TaskWithLabels[], filterState: FilterState): schema.TaskWithLabels[] {
	if (filterState.groups.length === 0) {
		return tasks;
	}

	return tasks.filter((task) => {
		const groupResults = filterState.groups.map((group) => {
			const conditionResults = group.conditions.map((condition) => evaluateCondition(task, condition));

			return group.operator === "AND"
				? conditionResults.every((result) => result)
				: conditionResults.some((result) => result);
		});

		return filterState.operator === "AND"
			? groupResults.every((result) => result)
			: groupResults.some((result) => result);
	});
}

function evaluateCondition(task: schema.TaskWithLabels, condition: FilterCondition): boolean {
	const { field, operator, value } = condition;

	switch (field) {
		case "status":
			return evaluateStringField(task.status, operator, value);

		case "priority":
			return evaluateStringField(task.priority, operator, value);

		case "assignee": {
			const assigneeIds = task.assignees?.map((a) => a.id) || [];
			return evaluateArrayField(assigneeIds, operator, value);
		}

		case "label": {
			const labelIds = task.labels?.map((l) => l.id) || [];
			return evaluateArrayField(labelIds, operator, value);
		}

		case "creator":
			return evaluateStringField(task.createdBy?.id, operator, value);

		case "created_at":
			return evaluateDateField(task.createdAt, operator, value);

		case "updated_at":
			return evaluateDateField(task.updatedAt, operator, value);

		case "title":
			return evaluateStringField(task.title, operator, value);

		default:
			return true;
	}
}

function evaluateStringField(
	fieldValue: string | null | undefined,
	operator: FilterOperator,
	filterValue: string | string[] | Date | null
): boolean {
	const val = fieldValue || "";
	const filterVal = filterValue as string;
	const filterVals = Array.isArray(filterValue) ? filterValue : [filterValue];

	switch (operator) {
		case "equals":
			return val === filterVal;
		case "not_equals":
			return val !== filterVal;
		case "contains":
			return val.toLowerCase().includes(filterVal?.toLowerCase() || "");
		case "not_contains":
			return !val.toLowerCase().includes(filterVal?.toLowerCase() || "");
		case "in":
			return filterVals.includes(val);
		case "not_in":
			return !filterVals.includes(val);
		case "is_empty":
			return !val || val.trim() === "";
		case "is_not_empty":
			return !!(val && val.trim() !== "");
		default:
			return true;
	}
}

function evaluateArrayField(
	fieldArray: string[],
	operator: FilterOperator,
	filterValue: string | string[] | Date | null
): boolean {
	const filterVals = Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue as string] : [];

	switch (operator) {
		case "equals":
			return fieldArray.length === 1 && fieldArray[0] === filterValue;
		case "not_equals":
			return fieldArray.length !== 1 || fieldArray[0] !== filterValue;
		case "in":
			return filterVals.some((val) => fieldArray.includes(val));
		case "not_in":
			return !filterVals.some((val) => fieldArray.includes(val));
		case "is_empty":
			return fieldArray.length === 0;
		case "is_not_empty":
			return fieldArray.length > 0;
		default:
			return true;
	}
}

function evaluateDateField(
	fieldValue: Date | string | null | undefined,
	operator: FilterOperator,
	filterValue: string | string[] | Date | null
): boolean {
	if (!fieldValue) return false;

	const fieldDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
	const filterDate = filterValue instanceof Date ? filterValue : filterValue ? new Date(filterValue as string) : null;

	if (!filterDate) return false;

	switch (operator) {
		case "before":
			return fieldDate < filterDate;
		case "after":
			return fieldDate > filterDate;
		case "equals":
			return fieldDate.toDateString() === filterDate.toDateString();
		// Add between logic here if needed
		default:
			return true;
	}
}

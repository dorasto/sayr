import type { schema } from "@repo/database";
import {
	IconCalendar,
	IconCategory2,
	IconTag,
	IconTextSize,
	IconUser,
} from "@tabler/icons-react";
import { priorityConfig, statusConfig } from "../shared/config";
import type {
	DateRangeValue,
	FilterCondition,
	FilterFieldConfig,
	FilterOperator,
	FilterState,
	FilterValue,
} from "./types";

// Convert status config to filter options
const STATUS_OPTIONS = Object.entries(statusConfig).map(([value, config]) => ({
	value,
	label: config.label,
	color: config.color,
	icon: config.icon("w-3 h-3"),
}));

const PRIORITY_OPTIONS = Object.entries(priorityConfig).map(
	([value, config]) => ({
		value,
		label: config.label,
		color: config.color,
		icon: config.icon("w-3 h-3"),
	}),
);
export const FILTER_FIELD_CONFIGS: FilterFieldConfig[] = [
	// Single-value enumerations (status, priority) – only any/none + empties if ever needed
	{
		field: "status",
		label: "Status",
		icon: statusConfig.todo.icon("w-4 h-4"),
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (_t, _l, _u, subSearch) =>
			STATUS_OPTIONS.filter((o) =>
				o.label.toLowerCase().includes(subSearch?.toLowerCase() || ""),
			),
	},
	{
		field: "priority",
		label: "Priority",
		icon: priorityConfig.medium.icon("w-4 h-4"),
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (_t, _l, _u, subSearch) =>
			PRIORITY_OPTIONS.filter((o) =>
				o.label.toLowerCase().includes(subSearch?.toLowerCase() || ""),
			),
	},
	{
		field: "category",
		label: "Category",
		icon: <IconCategory2 className="w-4 h-4" />,
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (tasks, _labels, _users, subSearch, categories) => {
			const ids = new Set<string>();
			tasks.forEach((t) => t.assignees?.forEach((a) => ids.add(a.id)));
			const q = subSearch.toLowerCase();
			return categories
				.filter((c) => c.name.toLowerCase().includes(q || ""))
				.map((category) => ({
					value: category.id,
					label: category.name,
					color: category.color || "#cccccc",
				}));
		},
	},
	// Multi-value relations
	{
		field: "assignee",
		label: "Assignee",
		icon: <IconUser className="w-4 h-4" />,
		operators: ["any", "all", "none", "empty", "not_empty", "exact"],
		filterDefault: "any",
		multi: true,
		empty: "Unassigned",
		getOptions: (tasks, _labels, users, subSearch) => {
			const ids = new Set<string>();
			tasks.forEach((t) => t.assignees?.forEach((a) => ids.add(a.id)));
			const q = subSearch.toLowerCase();
			return users
				.filter(
					(u) =>
						ids.has(u.id) &&
						(u.name?.toLowerCase().includes(q) ||
							u.email?.toLowerCase().includes(q)),
				)
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
		operators: ["any", "all", "none", "empty", "not_empty", "exact"],
		filterDefault: "any",
		multi: true,
		empty: "No labels",
		getOptions: (_t, labels, _u, subSearch) => {
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
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (_t, _l, users, subSearch) => {
			const q = subSearch.toLowerCase();
			return users
				.filter(
					(u) =>
						u.name?.toLowerCase().includes(q) ||
						u.email?.toLowerCase().includes(q),
				)
				.map((u) => ({
					value: u.id,
					label: u.name || "Unknown User",
					image: u.image || "",
				}));
		},
	},
	// Dates
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
	// Text
	{
		field: "title",
		label: "Title",
		icon: <IconTextSize className="w-4 h-4" />,
		operators: [
			"contains",
			"not_contains",
			"any",
			"none",
			"empty",
			"not_empty",
		],
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
export function applyFilters(
	tasks: schema.TaskWithLabels[],
	filterState: FilterState,
): schema.TaskWithLabels[] {
	if (filterState.groups.length === 0) {
		return tasks;
	}

	return tasks.filter((task) => {
		const groupResults = filterState.groups.map((group) => {
			const conditionResults = group.conditions.map((condition) =>
				evaluateCondition(task, condition),
			);

			return group.operator === "AND"
				? conditionResults.every((result) => result)
				: conditionResults.some((result) => result);
		});

		return filterState.operator === "AND"
			? groupResults.every((result) => result)
			: groupResults.some((result) => result);
	});
}

// --- Evaluation (new unified handlers) ---

function parseDateInput(val: FilterValue): Date | null {
	if (!val) return null;
	if (typeof val === "string") return new Date(val);
	if (Array.isArray(val))
		return val.length > 0 ? new Date(val[0] as string) : null; // not expected but fallback
	if (typeof val === "object" && "start" in val) return new Date(val.start);
	return null;
}
// Handlers for each operator. All treat single raw values as length-1 arrays for uniformity.
const operatorHandlers: Record<
	FilterOperator,
	(raw: unknown, fv: FilterValue) => boolean
> = {
	any: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return true; // no selections -> no restriction
		return sel.some((v) => rawArr.includes(v));
	},
	none: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return true; // treat empty as no-op
		return sel.every((v) => !rawArr.includes(v));
	},
	all: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return true;
		return sel.every((v) => rawArr.includes(v));
	},
	exact: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return rawArr.length === 0; // empty exact -> only pass if field empty
		if (rawArr.length !== sel.length) return false;
		return sel.every((v) => rawArr.includes(v));
	},
	contains: (raw, fv) =>
		String(raw || "")
			.toLowerCase()
			.includes(String(fv || "").toLowerCase()),
	not_contains: (raw, fv) => !operatorHandlers.contains(raw, fv),
	empty: (raw) => {
		if (raw == null) return true;
		if (Array.isArray(raw)) return raw.length === 0;
		if (typeof raw === "string") return raw.trim() === "";
		return false;
	},
	not_empty: (raw, fv) => !operatorHandlers.empty(raw, fv),
	before: (raw, fv) => {
		if (!raw || !fv) return false;
		const rawDate = new Date(raw as string).getTime();
		const cmpDate = parseDateInput(fv);
		if (!cmpDate) return false;
		return rawDate < cmpDate.getTime();
	},
	after: (raw, fv) => {
		if (!raw || !fv) return false;
		const rawDate = new Date(raw as string).getTime();
		const cmpDate = parseDateInput(fv);
		if (!cmpDate) return false;
		return rawDate > cmpDate.getTime();
	},
	between: (raw, fv) => {
		if (!raw || !fv) return false;
		if (typeof fv !== "object" || fv === null) return false;
		const { start, end } = fv as DateRangeValue;
		if (!start || !end) return false;
		const d = new Date(raw as string).getTime();
		const s = new Date(start).getTime();
		const e = new Date(end).getTime();
		const min = Math.min(s, e);
		const max = Math.max(s, e);
		return d >= min && d <= max;
	},
};

function extractFieldValue(
	task: schema.TaskWithLabels,
	field: string,
): unknown {
	switch (field) {
		case "status":
			return task.status || null;
		case "priority":
			return task.priority || null;
		case "category":
			return task.category || null;
		case "assignee":
			return (task.assignees || []).map((a) => a.id);
		case "label":
			return (task.labels || []).map((l) => l.id);
		case "creator":
			return task.createdBy?.id || null;
		case "created_at":
			return task.createdAt;
		case "updated_at":
			return task.updatedAt;
		case "title":
			return task.title || "";
		default:
			return null;
	}
}

function evaluateCondition(
	task: schema.TaskWithLabels,
	condition: FilterCondition,
): boolean {
	const raw = extractFieldValue(task, condition.field);
	const handler = operatorHandlers[condition.operator];
	if (!handler) return true;
	return handler(raw, condition.value);
}

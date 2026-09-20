import type { schema } from "@repo/database";
import {
	IconBuilding,
	IconCalendar,
	IconCategory2,
	IconRocket,
	IconTag,
	IconTextSize,
	IconUser,
} from "@tabler/icons-react";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../config/field-config";
import type {
	DateRangeValue,
	FilterCondition,
	FilterFieldConfig,
	FilterOperator,
	FilterOption,
	FilterState,
	FilterValue,
} from "./types";

function buildOrgNameMap(tasks: schema.TaskWithLabels[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const task of tasks) {
		if (task.organization && !map.has(task.organizationId)) {
			map.set(task.organizationId, task.organization.name);
		}
	}
	return map;
}

interface NamedOrgRow {
	id: string;
	name: string;
	organizationId: string;
	color?: string | null;
	/** Only present on label rows — carried through so the Label tab's option can show a lock icon. */
	visible?: schema.labelType["visible"];
}

/**
 * Groups org-scoped rows (labels/categories/releases) by name — two orgs with an
 * identically-named row collapse into one selectable option whose selection toggles
 * both underlying ids together, so filtering matches by "concept" across orgs rather
 * than one org's literal id. A name unique to one org keeps that org's name as a
 * trailing badge so a cross-org list doesn't read as ambiguous.
 */
function groupOptionsByName(rows: NamedOrgRow[], orgNameMap: Map<string, string>): FilterOption[] {
	const groups = new Map<string, NamedOrgRow[]>();
	for (const row of rows) {
		const existing = groups.get(row.name);
		if (existing) existing.push(row);
		else groups.set(row.name, [row]);
	}
	return Array.from(groups.values()).map((group) => {
		// biome-ignore lint/style/noNonNullAssertion: group is only ever created via [row] or push(row), never empty
		const first = group[0]!;
		if (group.length === 1) {
			return {
				value: first.id,
				label: first.name,
				color: first.color || "#cccccc",
				orgName: orgNameMap.get(first.organizationId),
				visible: first.visible,
			};
		}
		return {
			value: first.id,
			label: first.name,
			color: first.color || "#cccccc",
			mergedValues: group.map((r) => r.id),
			visible: first.visible,
		};
	});
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
	value,
	label: config.label,
	color: config.color,
	icon: config.icon("w-3 h-3"),
}));

const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
	value,
	label: config.label,
	color: config.color,
	icon: config.icon("w-3 h-3"),
}));

export const FIELD_CONFIGS: FilterFieldConfig[] = [
	// Cross-org only — doesn't exist in the org-scoped filter system.
	{
		field: "org",
		label: "Org",
		icon: <IconBuilding className="w-4 h-4" />,
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (tasks, _labels, _users, subSearch) => {
			const seen = new Map<string, { name: string; logo: string | null }>();
			for (const task of tasks) {
				if (task.organization && !seen.has(task.organizationId)) {
					seen.set(task.organizationId, { name: task.organization.name, logo: task.organization.logo });
				}
			}
			const q = subSearch.toLowerCase();
			return Array.from(seen.entries())
				.filter(([, org]) => org.name.toLowerCase().includes(q))
				.map(([id, org]) => ({ value: id, label: org.name, image: org.logo || "" }));
		},
	},
	{
		field: "status",
		label: "Status",
		icon: STATUS_CONFIG.todo.icon("w-4 h-4"),
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (_t, _l, _u, subSearch) =>
			STATUS_OPTIONS.filter((o) => o.label.toLowerCase().includes(subSearch?.toLowerCase() || "")),
	},
	{
		field: "priority",
		label: "Priority",
		icon: PRIORITY_CONFIG.medium.icon("w-4 h-4"),
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (_t, _l, _u, subSearch) =>
			PRIORITY_OPTIONS.filter((o) => o.label.toLowerCase().includes(subSearch?.toLowerCase() || "")),
	},
	{
		field: "category",
		label: "Category",
		icon: <IconCategory2 className="w-4 h-4" />,
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		getOptions: (tasks, _labels, _users, subSearch, categories) => {
			const q = subSearch.toLowerCase();
			const filtered = categories.filter((c) => c.name.toLowerCase().includes(q || ""));
			return groupOptionsByName(filtered, buildOrgNameMap(tasks));
		},
	},
	{
		field: "release",
		label: "Release",
		icon: <IconRocket className="w-4 h-4" />,
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		empty: "No release",
		getOptions: (tasks, _labels, _users, subSearch, _categories, releases) => {
			const q = subSearch.toLowerCase();
			const filtered = releases.filter((r) => r.name.toLowerCase().includes(q || ""));
			return groupOptionsByName(filtered, buildOrgNameMap(tasks));
		},
	},
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
				.filter((u) => ids.has(u.id) && u.name?.toLowerCase().includes(q))
				.map((u) => ({ value: u.id, label: u.name || "Unknown User", image: u.image || "" }));
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
		getOptions: (tasks, labels, _u, subSearch) => {
			const q = subSearch.toLowerCase();
			const filtered = labels.filter((l) => l.name?.toLowerCase().includes(q));
			return groupOptionsByName(filtered, buildOrgNameMap(tasks));
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
				.filter((u) => u.name?.toLowerCase().includes(q))
				.map((u) => ({ value: u.id, label: u.name || "Unknown User", image: u.image || "" }));
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
		operators: ["contains", "not_contains", "any", "none", "empty", "not_empty"],
		filterDefault: "contains",
		getOptions(tasks, _labels, _users, subSearch) {
			const q = subSearch.toLowerCase();
			const uniqueTitles = new Set<string>();
			tasks
				.filter((task) => task.title?.toLowerCase().includes(q))
				.forEach((task) => {
					if (task.title) uniqueTitles.add(task.title.toLowerCase());
				});
			return Array.from(uniqueTitles).map((title) => ({ value: title, label: title }));
		},
	},
];

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

function parseDateInput(val: FilterValue): Date | null {
	if (!val) return null;
	if (typeof val === "string") return new Date(val);
	if (Array.isArray(val)) return val.length > 0 ? new Date(val[0] as string) : null;
	if (typeof val === "object" && "start" in val) return new Date(val.start);
	return null;
}

const operatorHandlers: Record<FilterOperator, (raw: unknown, fv: FilterValue) => boolean> = {
	any: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return true;
		return sel.some((v) => rawArr.includes(v));
	},
	none: (raw, fv) => {
		const rawArr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
		const sel = Array.isArray(fv) ? fv : fv == null ? [] : [fv];
		if (sel.length === 0) return true;
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
		if (sel.length === 0) return rawArr.length === 0;
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
		return d >= Math.min(s, e) && d <= Math.max(s, e);
	},
};

function extractFieldValue(task: schema.TaskWithLabels, field: string): unknown {
	switch (field) {
		case "org":
			return task.organizationId || null;
		case "status":
			return task.status || null;
		case "priority":
			return task.priority || null;
		case "category":
			return task.category || null;
		case "release":
			return task.releaseId || null;
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

function evaluateCondition(task: schema.TaskWithLabels, condition: FilterCondition): boolean {
	const raw = extractFieldValue(task, condition.field);
	const handler = operatorHandlers[condition.operator];
	if (!handler) return true;
	return handler(raw, condition.value);
}

/**
 * Per-raw-value occurrence counts across `tasks` for `field` — the basis for quick-filter
 * counts (quick-filter-panel.tsx runs this once per field, then sums per option via
 * mergedValues, since a cross-org merged option's count is the sum of its underlying ids').
 */
export function buildFieldValueCounts(tasks: schema.TaskWithLabels[], field: string): Map<string, number> {
	const counts = new Map<string, number>();
	for (const task of tasks) {
		const raw = extractFieldValue(task, field);
		const values = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
		for (const value of values) {
			const key = String(value);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	return counts;
}

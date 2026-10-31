import type { BoardItem } from "../core/board-item";
import type { DateRangeValue, FilterCondition, FilterOperator, FilterState, FilterValue } from "./types";

// The entity-agnostic half of the filter engine: operator semantics, condition/state evaluation and value
// counts, all driven by an entity's `extract(item, field)`. Split out of filter-config.tsx (which keeps the
// task field vocabulary) so any board entity reuses it, and so vitest can cover it (type-only imports).

/** Pulls the raw value(s) of `field` off one item: an id, an id array, a date, a string, or null. */
export type FilterFieldExtractor<T extends BoardItem> = (item: T, field: string) => unknown;

function parseDateInput(val: FilterValue): Date | null {
	if (!val) return null;
	if (typeof val === "string") return new Date(val);
	if (Array.isArray(val)) return val.length > 0 ? new Date(val[0] as string) : null;
	if (typeof val === "object" && "start" in val) return new Date(val.start);
	return null;
}

function toArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : value == null ? [] : [value];
}

export const operatorHandlers: Record<FilterOperator, (raw: unknown, fv: FilterValue) => boolean> = {
	any: (raw, fv) => {
		const rawArr = toArray(raw);
		const sel = toArray(fv);
		if (sel.length === 0) return true;
		return sel.some((v) => rawArr.includes(v));
	},
	none: (raw, fv) => {
		const rawArr = toArray(raw);
		const sel = toArray(fv);
		if (sel.length === 0) return true;
		return sel.every((v) => !rawArr.includes(v));
	},
	all: (raw, fv) => {
		const rawArr = toArray(raw);
		const sel = toArray(fv);
		if (sel.length === 0) return true;
		return sel.every((v) => rawArr.includes(v));
	},
	exact: (raw, fv) => {
		const rawArr = toArray(raw);
		const sel = toArray(fv);
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
	// The date operators pass everything until a date is picked (like an empty multi-select), so a freshly
	// added date filter doesn't blank the board; once set, an item without the date doesn't match.
	before: (raw, fv) => {
		if (!fv) return true;
		if (!raw) return false;
		const rawDate = new Date(raw as string).getTime();
		const cmpDate = parseDateInput(fv);
		if (!cmpDate) return false;
		return rawDate < cmpDate.getTime();
	},
	after: (raw, fv) => {
		if (!fv) return true;
		if (!raw) return false;
		const rawDate = new Date(raw as string).getTime();
		const cmpDate = parseDateInput(fv);
		if (!cmpDate) return false;
		return rawDate > cmpDate.getTime();
	},
	between: (raw, fv) => {
		if (!fv) return true;
		if (typeof fv !== "object" || Array.isArray(fv)) return false;
		const { start, end } = fv as DateRangeValue;
		if (!start || !end) return true;
		if (!raw) return false;
		const d = new Date(raw as string).getTime();
		const s = new Date(start).getTime();
		const e = new Date(end).getTime();
		return d >= Math.min(s, e) && d <= Math.max(s, e);
	},
};

export function evaluateFilterCondition<T extends BoardItem>(
	item: T,
	condition: FilterCondition,
	extract: FilterFieldExtractor<T>
): boolean {
	const handler = operatorHandlers[condition.operator];
	if (!handler) return true;
	return handler(extract(item, condition.field), condition.value);
}

/** The items matching `filterState` (groups combined by its operator, conditions by each group's). */
export function applyFilterState<T extends BoardItem>(
	items: readonly T[],
	filterState: FilterState,
	extract: FilterFieldExtractor<T>
): readonly T[] {
	if (filterState.groups.length === 0) return items;
	return items.filter((item) => {
		const groupResults = filterState.groups.map((group) => {
			const conditionResults = group.conditions.map((condition) =>
				evaluateFilterCondition(item, condition, extract)
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

/** Per-raw-value occurrence counts across `items` for `field` (the quick-filter counts). */
export function countFieldValues<T extends BoardItem>(
	items: readonly T[],
	field: string,
	extract: FilterFieldExtractor<T>
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const item of items) {
		const raw = extract(item, field);
		const values = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
		for (const value of values) {
			const key = String(value);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	return counts;
}

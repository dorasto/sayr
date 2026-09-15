import type { FilterCondition, FilterField, FilterGroup, FilterOperator, FilterState } from "./types";

// Browser-compatible base64 encoding/decoding with UTF-8 support
const toBase64 = (str: string): string => {
	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
};

const fromBase64 = (str: string): string => {
	return decodeURIComponent(
		atob(str)
			.split("")
			.map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
			.join("")
	);
};

export const serializeFilters = (state: FilterState): string => {
	try {
		const minimal = state.groups.map((g) => g.conditions.map((c) => [c.field, c.operator, c.value]));
		if (minimal.length <= 0) {
			return "";
		}
		const json = JSON.stringify(minimal);
		return encodeURIComponent(toBase64(json));
	} catch (e) {
		console.error("[board/serializeFilters] Error:", e);
		return "";
	}
};

export const deserializeFilters = (value: string): FilterState | null => {
	try {
		if (!value) return null;
		const decoded = fromBase64(decodeURIComponent(value));
		const minimal: [string, string, unknown][][] = JSON.parse(decoded);
		const groups: FilterGroup[] = minimal.map((conditions, gi) => ({
			id: `group-${gi}`,
			operator: "AND",
			conditions: conditions.map(([field, operator, val], ci) => ({
				id: `${field}-${operator}-${ci}-${Date.now()}`,
				field: field as FilterField,
				operator: operator as FilterOperator,
				value: val as FilterCondition["value"],
			})),
		}));
		return { groups, operator: "AND" };
	} catch (e) {
		console.error("[board/deserializeFilters] Error:", e);
		return null;
	}
};

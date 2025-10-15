import type { FilterCondition, FilterField, FilterGroup, FilterOperator, FilterState } from "../types";

export const serializeFilters = (state: FilterState): string => {
	try {
		const minimal = state.groups.map((g) => g.conditions.map((c) => [c.field, c.operator, c.value]));
		if (minimal.length <= 0) {
			return "";
		}
		const json = JSON.stringify(minimal);
		return encodeURIComponent(Buffer.from(json, "utf-8").toString("base64"));
	} catch {
		return "";
	}
};

export const deserializeFilters = (value: string): FilterState | null => {
	try {
		const decoded = Buffer.from(decodeURIComponent(value), "base64").toString("utf-8");
		const minimal: [string, string, unknown][][] = JSON.parse(decoded);
		const groups: FilterGroup[] = minimal.map((conditions, gi) => ({
			id: `group-${gi}`,
			operator: "AND",
			conditions: conditions.map(([field, rawOperator, val], ci) => {
				// Backward compatibility mapping
				let operator = rawOperator as FilterOperator;
				if (rawOperator === "is") operator = "any";
				else if (rawOperator === "is_not") operator = "none";
				return {
					id: `${field}-${operator}-${ci}-${Date.now()}`,
					field: field as FilterField,
					operator,
					value: val as FilterCondition["value"],
				};
			}),
		}));
		return { groups, operator: "AND" };
	} catch {
		return null;
	}
};

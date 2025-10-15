import { FILTER_FIELD_CONFIGS } from "../filter-config";
import type { FilterCondition, FilterField, FilterFieldConfig, FilterOperator, FilterState } from "../types";

export const getFieldConfig = (field: FilterField): FilterFieldConfig | undefined =>
	FILTER_FIELD_CONFIGS.find((c) => c.field === field);

export const isMultiCondition = (c: FilterCondition): boolean => {
	const cfg = getFieldConfig(c.field);
	return !!cfg?.multi && ["any", "all", "none", "exact"].includes(c.operator);
};

export function mergeOrAppendCondition(filterState: FilterState, condition: FilterCondition): FilterState {
	const cfg = getFieldConfig(condition.field);
	if (cfg?.multi && ["any", "all", "none", "exact"].includes(condition.operator)) {
		let merged = false;
		const groups = filterState.groups.map((g, gi) => {
			if (gi !== 0) return g;
			return {
				...g,
				conditions: g.conditions.map((c) => {
					if (c.field === condition.field && c.operator === condition.operator) {
						merged = true;
						const existing = Array.isArray(c.value) ? c.value : c.value ? [c.value as string] : [];
						if (!existing.includes(condition.value as string)) {
							return { ...c, value: [...existing, condition.value as string] };
						}
						return c;
					}
					return c;
				}),
			};
		});
		if (merged) {
			return { ...filterState, groups };
		}
	}
	// append new
	const newGroup = {
		id: `group-${Date.now()}`,
		conditions: [condition],
		operator: "AND" as const,
	};
	return {
		...filterState,
		groups:
			filterState.groups.length > 0
				? filterState.groups.map((g, idx) => (idx === 0 ? { ...g, conditions: [...g.conditions, condition] } : g))
				: [newGroup],
	};
}

export function toggleMultiValue(filterState: FilterState, conditionId: string, value: string): FilterState {
	return {
		...filterState,
		groups: filterState.groups
			.map((group) => ({
				...group,
				conditions: group.conditions.map((c) => {
					if (c.id !== conditionId) return c;
					if (!isMultiCondition(c)) return c;
					const current = Array.isArray(c.value) ? c.value : c.value ? [c.value as string] : [];
					const exists = current.includes(value);
					const next = exists ? current.filter((v) => v !== value) : [...current, value];
					if (next.length === 0) return { ...c, value: [] };
					return { ...c, value: next };
				}),
			}))
			.map((g) => ({
				...g,
				conditions: g.conditions.filter((c) => !(Array.isArray(c.value) && c.value.length === 0)),
			}))
			.filter((g) => g.conditions.length > 0),
	};
}

export function updateConditionOperator(
	filterState: FilterState,
	filterId: string,
	newOperator: FilterOperator
): FilterState {
	return {
		...filterState,
		groups: filterState.groups.map((g) => ({
			...g,
			conditions: g.conditions.map((c) => {
				if (c.id !== filterId) return c;
				const newIsMulti = ["any", "all", "none", "exact"].includes(newOperator);
				const currentIsMulti = isMultiCondition(c);
				if (!newIsMulti && currentIsMulti && Array.isArray(c.value)) {
					return { ...c, operator: newOperator, value: c.value[0] ?? "" };
				}
				return { ...c, operator: newOperator };
			}),
		})),
	};
}

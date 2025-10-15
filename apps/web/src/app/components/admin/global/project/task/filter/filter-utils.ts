import type { schema } from "@repo/database";
import type { DateRangeValue, FilterOperator, FilterState } from "./types";

/**
 * Hook to get a human-readable description of active filters
 */
export function useFilterDescription(filterState: FilterState, labels: schema.labelType[], users: schema.userType[]) {
	if (filterState.groups.length === 0) {
		return "No filters applied";
	}

	const opPhrase = (op: FilterOperator, base: string) => {
		switch (op) {
			case "any":
				return `${base} has any of`;
			case "all":
				return `${base} has all of`;
			case "none":
				return `${base} has none of`;
			case "exact":
				return `${base} is exactly`;
			case "contains":
				return `${base} contains`;
			case "not_contains":
				return `${base} does not contain`;
			case "before":
				return `${base} is before`;
			case "after":
				return `${base} is after`;
			case "between":
				return `${base} is between`;
			case "empty":
				return `${base} is empty`;
			case "not_empty":
				return `${base} is not empty`;
			default:
				return `${base}`;
		}
	};

	const descriptions = filterState.groups.map((group) => {
		const conditionDescriptions = group.conditions.map((condition) => {
			const fieldName = condition.field;
			let valueName = condition.label || String(condition.value);

			if (Array.isArray(condition.value)) {
				valueName = condition.value.join(", ");
			}

			if (typeof condition.value === "object" && condition.value && "start" in condition.value) {
				const { start, end } = condition.value as DateRangeValue;
				valueName = `${start} → ${end}`;
			}

			if (condition.field === "label" && typeof condition.value === "string") {
				const label = labels.find((l) => l.id === condition.value);
				valueName = label?.name || valueName;
			} else if (condition.field === "assignee" && typeof condition.value === "string") {
				const user = users.find((u) => u.id === condition.value);
				valueName = user?.name || valueName;
			} else if (condition.field === "creator" && typeof condition.value === "string") {
				const user = users.find((u) => u.id === condition.value);
				valueName = user?.name || valueName;
			}

			if (condition.operator === "empty" || condition.operator === "not_empty") {
				return opPhrase(condition.operator, fieldName);
			}

			return `${opPhrase(condition.operator, fieldName)} ${valueName}`;
		});

		return conditionDescriptions.join(` ${group.operator} `);
	});

	return descriptions.join(` ${filterState.operator} `);
}

/**
 * Hook to get filter statistics
 */
export function getFilterStats(tasks: schema.TaskWithLabels[], filterState: FilterState) {
	const totalTasks = tasks.length;
	const { applyFilters } = require("./filter-config");
	const filteredTasks = applyFilters(tasks, filterState);
	const filteredCount = filteredTasks.length;

	return {
		total: totalTasks,
		filtered: filteredCount,
		hidden: totalTasks - filteredCount,
		percentage: totalTasks > 0 ? Math.round((filteredCount / totalTasks) * 100) : 0,
	};
}

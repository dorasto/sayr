import type { schema } from "@repo/database";
import type { FilterState } from "./types";

/**
 * Hook to get a human-readable description of active filters
 */
export function useFilterDescription(filterState: FilterState, labels: schema.labelType[], users: schema.userType[]) {
	if (filterState.groups.length === 0) {
		return "No filters applied";
	}

	const descriptions = filterState.groups.map((group) => {
		const conditionDescriptions = group.conditions.map((condition) => {
			const fieldName = condition.field;
			let valueName = condition.label || String(condition.value);

			// Enhance value display based on field type
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

			return `${fieldName} is ${valueName}`;
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

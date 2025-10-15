import type { FilterOperator } from "../types";

export const getOperatorLabel = (operator: FilterOperator): string => {
	switch (operator) {
		case "equals":
			return "is";
		case "not_equals":
			return "not";
		case "in":
			return "includes";
		case "not_in":
			return "excludes";
		case "contains":
			return "has";
		case "not_contains":
			return "lacks";
		case "before":
			return "before";
		case "after":
			return "after";
		case "between":
			return "between";
		case "is_empty":
			return "empty";
		case "is_not_empty":
			return "not empty";
		default:
			return operator;
	}
};

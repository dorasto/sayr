import type { FilterOperator } from "./types";

export const getOperatorLabel = (operator: FilterOperator): string => {
	switch (operator) {
		case "any":
			return "Includes";
		case "all":
			return "Is";
		case "none":
			return "Doesn't have";
		case "exact":
			return "Exactly";
		case "contains":
			return "Contains";
		case "not_contains":
			return "Doesn't contain";
		case "before":
			return "Before";
		case "after":
			return "After";
		case "between":
			return "Between";
		case "empty":
			return "Is empty";
		case "not_empty":
			return "Is not empty";
		default:
			return operator;
	}
};

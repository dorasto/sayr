import type { FilterOperator } from "./types";

export function getOperatorLabel(operator: FilterOperator): string {
	switch (operator) {
		case "any":
			return "is any of";
		case "all":
			return "includes all of";
		case "none":
			return "is none of";
		case "exact":
			return "is exactly";
		case "contains":
			return "contains";
		case "not_contains":
			return "doesn't contain";
		case "before":
			return "before";
		case "after":
			return "after";
		case "between":
			return "between";
		case "empty":
			return "is empty";
		case "not_empty":
			return "is not empty";
		default:
			return operator;
	}
}

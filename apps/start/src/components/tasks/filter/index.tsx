// Filter system components and utilities

// Components
export { TaskFilterDropdown } from "./TaskFilterDropdown";
export { FilterBadges } from "./FilterBadges";
export { FilterMenu } from "./FilterMenu";
export { NewViewPopover } from "./NewView";

// Hooks
export { useTaskViewState } from "./use-task-view-state";

// Config and utilities
export { FILTER_FIELD_CONFIGS, applyFilters } from "./filter-config";
export { getOperatorLabel } from "./operators";
export { serializeFilters, deserializeFilters } from "./serialization";
export {
	getFieldConfig,
	isMultiCondition,
	mergeOrAppendCondition,
	toggleMultiValue,
	updateConditionOperator,
} from "./multi-select";

// Types
export type {
	TaskGroupingId,
	TaskGroup,
	TaskGroupingContext,
	TaskGroupingDefinition,
	TaskViewState,
	FilterOperator,
	FilterField,
	DateRangeValue,
	FilterValue,
	FilterCondition,
	FilterGroup,
	FilterState,
	FilterOption,
	FilterFieldConfig,
} from "./types";

export {
	TASK_VIEW_STATE_KEY,
	DEFAULT_TASK_VIEW_STATE,
} from "./types";

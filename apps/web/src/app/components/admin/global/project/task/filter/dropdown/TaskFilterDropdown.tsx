"use client";
import type { schema } from "@repo/database";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { FILTER_FIELD_CONFIGS } from "../filter-config";
import type { FilterCondition, FilterField, FilterGroup, FilterOperator, FilterState } from "../types";
import { FilterBadges } from "./FilterBadges";
import { FilterMenu } from "./FilterMenu";
import {
	getFieldConfig,
	isMultiCondition,
	mergeOrAppendCondition,
	toggleMultiValue as toggleValueHelper,
	updateConditionOperator,
} from "./multi-select";
import { getOperatorLabel } from "./operators"; // re-exported below
import { deserializeFilters, serializeFilters } from "./serialization";

interface TaskFilterDropdownProps {
	tasks: schema.TaskWithLabels[];
	labels: schema.labelType[];
	availableUsers: schema.userType[];
}

export function TaskFilterDropdown({ tasks: _tasks, labels, availableUsers }: TaskFilterDropdownProps) {
	// Query + persisted state
	const [filtersParam, setFiltersParam] = useQueryState("filters", parseAsString.withDefault(""));
	const { value: filterState, setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		deserializeFilters(filtersParam) || { groups: [], operator: "AND" },
		1
	);

	const pathname = usePathname();

	useEffect(() => {
		const serialized = serializeFilters(filterState);
		setFiltersParam(serialized);
	}, [filterState, setFiltersParam]);

	// Local UI state
	const [mainSearch, setMainSearch] = useState("");
	const [subSearch, setSubSearch] = useState("");

	const activeFiltersCount = useMemo(
		() => filterState.groups.reduce((count, group) => count + group.conditions.length, 0),
		[filterState]
	);

	// Helpers (no functional updater since setValue expects final value)
	const addFilter = (condition: FilterCondition) => {
		setFilterState(mergeOrAppendCondition(filterState, condition));
	};

	const removeFilter = (filterId: string) => {
		const newGroups: FilterGroup[] = filterState.groups
			.map((g: FilterGroup) => ({
				...g,
				conditions: g.conditions.filter((c: FilterCondition) => c.id !== filterId),
			}))
			.filter((g: FilterGroup) => g.conditions.length > 0);
		setFilterState({ ...filterState, groups: newGroups });
	};

	const updateFilterOperator = (filterId: string, op: FilterOperator) => {
		setFilterState(updateConditionOperator(filterState, filterId, op));
	};

	const toggleMultiValue = (conditionId: string, value: string) => {
		setFilterState(toggleValueHelper(filterState, conditionId, value));
	};

	const getAvailableOperators = (field: FilterField): FilterOperator[] => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
		return config?.operators || ["any"];
	};

	const getAvailableOptions = (field: FilterField) => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
		return typeof config?.getOptions === "function"
			? config.getOptions(_tasks, labels, availableUsers, subSearch)
			: [];
	};

	const clearFilters = () => setFilterState({ groups: [], operator: "AND" });

	const shareUrl = useMemo(() => {
		const serialized = serializeFilters(filterState);
		if (typeof window === "undefined") return "";
		return `${window.location.origin}${pathname}${serialized ? `?filters=${serialized}` : ""}`;
	}, [filterState, pathname]);

	const handleFilterAdd = (field: string, operator: FilterOperator, value: string) => {
		addFilter({
			id: `${field}-${operator}-${value}-${Date.now()}`,
			field: field as FilterField,
			operator,
			value,
		});
	};

	// Render value helper
	const renderFilterValue = (condition: FilterCondition) => {
		switch (condition.field) {
			case "status":
			case "priority":
				return (
					<span className="truncate">
						{Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value ?? "")}
					</span>
				);
			default: {
				if (typeof condition.value === "string") return <span>{condition.value}</span>;
				if (Array.isArray(condition.value)) return <span>{condition.value.join(", ")}</span>;
				if (condition.value instanceof Date) return <span>{condition.value.toLocaleDateString()}</span>;
				return <span>{String(condition.value ?? "")}</span>;
			}
		}
	};

	const filteredConfigs = FILTER_FIELD_CONFIGS.filter(
		(config) =>
			config.label.toLowerCase().includes(mainSearch.toLowerCase()) ||
			config.field.toLowerCase().includes(mainSearch.toLowerCase())
	);

	return (
		<div className="flex items-center gap-2">
			<FilterBadges
				conditions={filterState.groups.flatMap((g) => g.conditions)}
				labels={labels}
				availableUsers={availableUsers}
				removeFilter={removeFilter}
				updateFilterOperator={updateFilterOperator}
				toggleValue={toggleMultiValue}
				getAvailableOptions={getAvailableOptions}
				getAvailableOperators={getAvailableOperators}
				renderFilterValue={renderFilterValue}
			/>
			<FilterMenu
				activeFiltersCount={activeFiltersCount}
				filteredConfigs={filteredConfigs}
				mainSearch={mainSearch}
				setMainSearch={setMainSearch}
				subSearch={subSearch}
				setSubSearch={setSubSearch}
				clearFilters={clearFilters}
				handleFilterAdd={handleFilterAdd}
				getAvailableOptions={getAvailableOptions}
			/>
			{activeFiltersCount > 0 && (
				<SimpleClipboard
					textToCopy={shareUrl}
					variant="accent"
					size="sm"
					tooltipText="Copy view URL"
					tooltipCopiedText="View URL copied"
					className="gap-1 h-6 w-6 bg-accent border-transparent p-1 relative"
				/>
			)}
		</div>
	);
}

export { getOperatorLabel, getFieldConfig, isMultiCondition };

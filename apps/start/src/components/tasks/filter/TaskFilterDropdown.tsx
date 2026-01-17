"use client";
import type { schema } from "@repo/database";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useTaskViewManager,
  type FilterCondition,
  type FilterField,
  type FilterOperator,
} from "@/hooks/useTaskViewManager";
import { FilterBadges } from "./FilterBadges";
import { FilterMenu } from "./FilterMenu";
import { FILTER_FIELD_CONFIGS } from "./filter-config";
import { getFieldConfig, isMultiCondition } from "./multi-select";
import { NewViewPopover } from "./NewView";
import { getOperatorLabel } from "./operators"; // re-exported below
import { serializeFilters } from "./serialization";

interface Props {
  tasks: schema.TaskWithLabels[];
  labels: schema.labelType[];
  availableUsers: schema.userType[];
  organizationId: string;
  views: schema.savedViewType[];
  setViews: (newValue: Props["views"]) => void;
  categories: schema.categoryType[];
}

export function TaskFilterDropdown({
  tasks: _tasks,
  labels,
  availableUsers,
  organizationId,
  setViews,
  views,
  categories,
}: Props) {
  console.log("[RENDER] TaskFilterDropdown");

  // Consolidated task view state management
  const {
    filters,
    viewSlug,
    viewConfig,
    addFilter: hookAddFilter,
    removeFilter: hookRemoveFilter,
    updateFilterOperator: hookUpdateFilterOperator,
    toggleFilterValue,
    clearFilters: hookClearFilters,
  } = useTaskViewManager();

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname =
    rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;

  // Local UI state
  const [mainSearch, setMainSearch] = useState("");

  const activeFiltersCount = useMemo(
    () =>
      filters.groups.reduce(
        (count, group) => count + group.conditions.length,
        0,
      ),
    [filters],
  );

  const getAvailableOperators = (field: FilterField): FilterOperator[] => {
    const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
    return config?.operators || ["any"];
  };

  const getAvailableOptions = (field: FilterField) => {
    const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
    return typeof config?.getOptions === "function"
      ? config.getOptions(_tasks, labels, availableUsers, "", categories)
      : [];
  };

  const getSelectedValues = (field: FilterField): string[] => {
    return filters.groups
      .flatMap((g) => g.conditions)
      .filter((c) => c.field === field)
      .flatMap((c) => {
        if (Array.isArray(c.value)) return c.value as string[];
        if (typeof c.value === "string") return [c.value];
        return [];
      });
  };

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    // If a saved view is active, share the view URL (no filters param needed)
    if (viewSlug) {
      return `${window.location.origin}${pathname}?view=${viewSlug}`;
    }
    // Otherwise, share with filters param
    const serialized = serializeFilters(filters);
    return `${window.location.origin}${pathname}${serialized ? `?filters=${serialized}` : ""}`;
  }, [filters, pathname, viewSlug]);

  const currentFiltersString = useMemo(
    () => serializeFilters(filters),
    [filters],
  );

  const currentViewConfig = useMemo(
    () => ({
      mode: viewConfig.viewMode,
      groupBy: viewConfig.grouping,
      showCompletedTasks: viewConfig.showCompletedTasks,
      showEmptyGroups: viewConfig.showEmptyGroups,
    }),
    [viewConfig],
  );

  const showNewViewPopover = useMemo(() => {
    // Don't show if a view with these exact filters AND config already exists
    const viewExists = views.some((view) => {
      const filtersMatch = view.filterParams === currentFiltersString;
      // biome-ignore lint/suspicious/noExplicitAny: viewConfig is jsonb
      const config = view.viewConfig as any;
      const configMatch =
        config &&
        config.mode === currentViewConfig.mode &&
        config.groupBy === currentViewConfig.groupBy &&
        config.showCompletedTasks === currentViewConfig.showCompletedTasks &&
        config.showEmptyGroups === currentViewConfig.showEmptyGroups;

      return filtersMatch && configMatch;
    });
    return !viewExists;
  }, [views, currentFiltersString, currentViewConfig]);

  const handleFilterAdd = (
    field: string,
    operator: FilterOperator,
    value: string,
  ) => {
    hookAddFilter({
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
            {Array.isArray(condition.value)
              ? condition.value.join(", ")
              : String(condition.value ?? "")}
          </span>
        );
      default: {
        if (typeof condition.value === "string")
          return <span>{condition.value}</span>;
        if (Array.isArray(condition.value))
          return <span>{condition.value.join(", ")}</span>;
        if (condition.value instanceof Date)
          return <span>{condition.value.toLocaleDateString()}</span>;
        return <span>{String(condition.value ?? "")}</span>;
      }
    }
  };

  const filteredConfigs = FILTER_FIELD_CONFIGS.filter(
    (config) =>
      config.label.toLowerCase().includes(mainSearch.toLowerCase()) ||
      config.field.toLowerCase().includes(mainSearch.toLowerCase()),
  );

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
      <FilterBadges
        conditions={filters.groups.flatMap((g) => g.conditions)}
        labels={labels}
        availableUsers={availableUsers}
        removeFilter={hookRemoveFilter}
        updateFilterOperator={hookUpdateFilterOperator}
        toggleValue={toggleFilterValue}
        getAvailableOptions={getAvailableOptions}
        getAvailableOperators={getAvailableOperators}
        renderFilterValue={renderFilterValue}
        categories={categories}
      />
      <FilterMenu
        activeFiltersCount={activeFiltersCount}
        filteredConfigs={filteredConfigs}
        mainSearch={mainSearch}
        setMainSearch={setMainSearch}
        clearFilters={hookClearFilters}
        handleFilterAdd={handleFilterAdd}
        getAvailableOptions={getAvailableOptions}
        getSelectedValues={getSelectedValues}
        conditions={filters.groups.flatMap((g) => g.conditions)}
        removeFilter={hookRemoveFilter}
        updateFilterOperator={hookUpdateFilterOperator}
        toggleValue={toggleFilterValue}
        getAvailableOperators={getAvailableOperators}
        labels={labels}
        availableUsers={availableUsers}
        categories={categories}
        renderFilterValue={renderFilterValue}
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
      {showNewViewPopover && (
        <NewViewPopover
          organizationId={organizationId}
          setViews={setViews}
          currentFilters={currentFiltersString}
          viewConfig={currentViewConfig}
        />
      )}
    </div>
  );
}

export { getOperatorLabel, getFieldConfig, isMultiCondition };

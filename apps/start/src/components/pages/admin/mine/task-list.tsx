import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Label } from "@repo/ui/components/label";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import {
  IconBuilding,
  IconCategory2,
  IconSortDescending,
  IconTag,
  IconUsers,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { FilterMenu } from "@/components/tasks/filter/FilterMenu";
import { FilterBadges } from "@/components/tasks/filter/FilterBadges";
import type {
  FilterCondition,
  FilterField,
  FilterFieldConfig,
  FilterOperator,
} from "@/components/tasks/filter/types";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import { applyFilters } from "@/components/tasks/filter/filter-config";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";

type SortOption = "newest" | "oldest" | "priority" | "status";

interface MyTasksListProps {
  tasks: schema.TaskWithLabels[];
  setTasks: (tasks: schema.TaskWithLabels[]) => void;
  selectedTask: schema.TaskWithLabels | null;
  setSelectedTask: (task: schema.TaskWithLabels | null) => void;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  }>;
  labels: schema.labelType[];
  categories: schema.categoryType[];
}

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

const statusOrder: Record<string, number> = {
  "in-progress": 0,
  todo: 1,
  backlog: 2,
  done: 3,
  canceled: 4,
};

// Status options
const STATUS_OPTIONS = Object.entries(statusConfig).map(([value, config]) => ({
  value,
  label: config.label,
  color: config.color,
  icon: config.icon("w-3 h-3"),
}));

// Priority options
const PRIORITY_OPTIONS = Object.entries(priorityConfig).map(
  ([value, config]) => ({
    value,
    label: config.label,
    color: config.color,
    icon: config.icon("w-3 h-3"),
  }),
);

export function MyTasksList({
  tasks,
  selectedTask,
  setSelectedTask,
  organizations,
  labels,
  categories,
}: MyTasksListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [mainSearch, setMainSearch] = useState("");
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    [],
  );

  // Filter field configurations specific to My Tasks page
  const MY_TASKS_FILTER_CONFIGS: FilterFieldConfig[] = useMemo(
    () => [
      {
        field: "status",
        label: "Status",
        icon: statusConfig.todo.icon("w-4 h-4"),
        operators: ["any", "none"],
        filterDefault: "any",
        multi: true,
        getOptions: () => STATUS_OPTIONS,
      },
      {
        field: "priority",
        label: "Priority",
        icon: priorityConfig.medium.icon("w-4 h-4"),
        operators: ["any", "none"],
        filterDefault: "any",
        multi: true,
        getOptions: () => PRIORITY_OPTIONS,
      },
      {
        field: "label",
        label: "Label",
        icon: <IconTag className="w-4 h-4" />,
        operators: ["any", "all", "none", "empty", "not_empty"],
        filterDefault: "any",
        multi: true,
        empty: "No labels",
        getOptions: () =>
          labels.map((label) => ({
            value: label.id,
            label: label.name,
            color: label.color || "#cccccc",
          })),
      },
      {
        field: "category",
        label: "Category",
        icon: <IconCategory2 className="w-4 h-4" />,
        operators: ["any", "none", "empty", "not_empty"],
        filterDefault: "any",
        multi: true,
        getOptions: () =>
          categories.map((category) => ({
            value: category.id,
            label: category.name,
            color: category.color || "#cccccc",
          })),
      },
      {
        field: "assignee",
        label: "Organization",
        icon: <IconBuilding className="w-4 h-4" />,
        operators: ["any"],
        filterDefault: "any",
        multi: true,
        getOptions: () =>
          organizations.map((org) => ({
            value: org.id,
            label: org.name,
          })),
      },
    ],
    [labels, categories, organizations],
  );

  // Custom organization filter field - remove the duplicate from MY_TASKS_FILTER_CONFIGS
  // and replace with organization-specific configuration

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Filter out done and cancelled tasks by default (unless explicitly filtered for them)
    const statusCondition = filterConditions.find((c) => c.field === "status");
    if (!statusCondition) {
      // No status filter applied, so exclude done and cancelled
      filtered = filtered.filter(
        (t) => t.status !== "done" && t.status !== "canceled",
      );
    }

    // Apply filter conditions using the filter system
    if (filterConditions.length > 0) {
      // Handle organization filter separately
      const orgCondition = filterConditions.find((c) => c.field === "assignee");
      if (orgCondition) {
        const orgValues = Array.isArray(orgCondition.value)
          ? orgCondition.value
          : [orgCondition.value];
        filtered = filtered.filter((t) =>
          orgValues.some((v) => v === t.organizationId),
        );
      }

      // Apply other filters using standard filter logic
      const otherConditions = filterConditions.filter(
        (c) => c.field !== "assignee",
      );
      if (otherConditions.length > 0) {
        filtered = applyFilters(filtered, {
          groups: [
            { id: "default", conditions: otherConditions, operator: "AND" },
          ],
          operator: "AND",
        });
      }
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime(),
        );
        break;
      case "priority":
        filtered.sort(
          (a, b) =>
            (priorityOrder[a.priority || "none"] ?? 4) -
            (priorityOrder[b.priority || "none"] ?? 4),
        );
        break;
      case "status":
        filtered.sort(
          (a, b) =>
            (statusOrder[a.status || "backlog"] ?? 2) -
            (statusOrder[b.status || "backlog"] ?? 2),
        );
        break;
    }

    return filtered;
  }, [tasks, sortBy, filterConditions]);

  const activeFiltersCount = filterConditions.length;

  const handleFilterAdd = (
    field: string,
    operator: FilterOperator,
    value: string,
  ) => {
    const existingCondition = filterConditions.find(
      (c) => c.field === field && c.operator === operator,
    );

    if (existingCondition) {
      // Add value to existing condition
      const currentValues = Array.isArray(existingCondition.value)
        ? existingCondition.value
        : existingCondition.value
          ? [existingCondition.value]
          : [];

      if (!currentValues.includes(value)) {
        setFilterConditions(
          filterConditions.map((c) =>
            c.id === existingCondition.id
              ? { ...c, value: [...currentValues, value] as string[] }
              : c,
          ),
        );
      }
    } else {
      // Create new condition
      setFilterConditions([
        ...filterConditions,
        {
          id: `${field}-${operator}-${value}-${Date.now()}`,
          field: field as FilterField,
          operator,
          value: [value] as string[],
        },
      ]);
    }
  };

  const removeFilter = (id: string) => {
    setFilterConditions(filterConditions.filter((c) => c.id !== id));
  };

  const updateFilterOperator = (id: string, operator: FilterOperator) => {
    setFilterConditions(
      filterConditions.map((c) => (c.id === id ? { ...c, operator } : c)),
    );
  };

  const toggleValue = (id: string, value: string) => {
    setFilterConditions(
      filterConditions.map((c) => {
        if (c.id !== id) return c;
        const values = Array.isArray(c.value)
          ? (c.value as string[])
          : typeof c.value === "string"
            ? [c.value]
            : [];
        const newValues = values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value];
        return newValues.length > 0
          ? { ...c, value: newValues as string[] }
          : c;
      }),
    );
  };

  const clearFilters = () => {
    setFilterConditions([]);
  };

  const getAvailableOptions = (field: FilterField) => {
    const config = MY_TASKS_FILTER_CONFIGS.find((c) => c.field === field);
    if (config && typeof config.getOptions === "function") {
      // Pass empty array for users since we don't need user filtering on My Tasks page
      return config.getOptions(tasks, labels, [], "", categories);
    }
    return [];
  };

  const getSelectedValues = (field: FilterField): string[] => {
    return filterConditions
      .filter((c) => c.field === field)
      .flatMap((c) => {
        if (Array.isArray(c.value)) return c.value as string[];
        if (typeof c.value === "string") return [c.value];
        return [];
      });
  };

  const getAvailableOperators = (field: FilterField): FilterOperator[] => {
    const config = MY_TASKS_FILTER_CONFIGS.find((c) => c.field === field);
    return config?.operators || ["any"];
  };

  const renderFilterValue = (condition: FilterCondition) => {
    if (typeof condition.value === "string")
      return <span>{condition.value}</span>;
    if (Array.isArray(condition.value))
      return <span>{condition.value.join(", ")}</span>;
    return <span>{String(condition.value ?? "")}</span>;
  };

  const filteredConfigs = MY_TASKS_FILTER_CONFIGS.filter(
    (config) =>
      config.label.toLowerCase().includes(mainSearch.toLowerCase()) ||
      config.field.toLowerCase().includes(mainSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex flex-col gap-2 bg-card">
        <div className="flex items-center gap-3 justify-between">
          <Label variant="heading" className="text-base">
            My Tasks
          </Label>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="bg-accent hover:bg-secondary border-transparent data-[state=open]:bg-secondary p-1.5 rounded-lg"
              >
                <IconSortDescending className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => setSortBy("newest")}
                className={cn(sortBy === "newest" && "bg-accent")}
              >
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("oldest")}
                className={cn(sortBy === "oldest" && "bg-accent")}
              >
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("priority")}
                className={cn(sortBy === "priority" && "bg-accent")}
              >
                Priority
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("status")}
                className={cn(sortBy === "status" && "bg-accent")}
              >
                Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters Row */}

        <div className="flex items-center gap-2 flex-wrap">
          {activeFiltersCount > 0 && (
            <FilterBadges
              conditions={filterConditions}
              labels={labels}
              availableUsers={[]}
              categories={categories}
              removeFilter={removeFilter}
              updateFilterOperator={updateFilterOperator}
              toggleValue={toggleValue}
              getAvailableOptions={getAvailableOptions}
              getAvailableOperators={getAvailableOperators}
              renderFilterValue={renderFilterValue}
            />
          )}
          <FilterMenu
            activeFiltersCount={activeFiltersCount}
            filteredConfigs={filteredConfigs}
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            clearFilters={clearFilters}
            handleFilterAdd={handleFilterAdd}
            getAvailableOptions={getAvailableOptions}
            getSelectedValues={getSelectedValues}
            conditions={filterConditions}
            removeFilter={removeFilter}
            updateFilterOperator={updateFilterOperator}
            toggleValue={toggleValue}
            getAvailableOperators={getAvailableOperators}
            labels={labels}
            availableUsers={[]}
            categories={categories}
            renderFilterValue={renderFilterValue}
          />
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-1">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <p className="text-sm">No tasks found</p>
              {activeFiltersCount > 0 && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            filteredAndSortedTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                onClick={() => {
                  if (isMobile) {
                    // Navigate to task detail page on mobile
                    const fullUrl = `/${task.organizationId}/tasks/${task.shortId}`;
                    navigate({ to: fullUrl });
                  } else {
                    // Toggle selected task on desktop
                    setSelectedTask(selectedTask?.id === task.id ? null : task);
                  }
                }}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TaskListItemProps {
  task: schema.TaskWithLabels;
  isSelected: boolean;
  onClick: () => void;
}

function TaskListItem({ task, isSelected, onClick }: TaskListItemProps) {
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 p-3 text-left hover:bg-accent transition-colors rounded-lg text-muted-foreground",
        isSelected && "bg-secondary hover:bg-secondary text-foreground",
        task.priority === "urgent" &&
          "bg-destructive/10 hover:bg-destructive/20",
        isSelected &&
          task.priority === "urgent" &&
          "bg-destructive/20 hover:bg-destructive/20",
      )}
    >
      {/* Organization badge */}
      {task.organization && (
        <div className="flex items-center flex-1 gap-1">
          <InlineLabel
            className="shrink"
            icon={
              <Avatar className="h-4 w-4">
                <AvatarImage
                  src={task.organization.logo || ""}
                  alt={task.organization.name}
                  className=""
                />
                <AvatarFallback className="rounded-md uppercase text-xs">
                  <IconUsers className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            }
            text={task.organization.name}
          />

          <span className="text-xs text-muted-foreground">#{task.shortId}</span>
          {/* meta */}
          <div className="flex items-center gap-2 text-xs ml-auto shrink-0">
            {status && (
              <div className="flex items-center gap-1">
                {status.icon(cn(status.className, "size-4"))}
              </div>
            )}
            {priority && task.priority !== "none" && (
              <div className="flex items-center gap-1">
                {priority.icon(cn(priority.className, "size-4"))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium line-clamp-1 ps-1.5">
        {task.title || "Untitled"}
      </p>
    </button>
  );
}

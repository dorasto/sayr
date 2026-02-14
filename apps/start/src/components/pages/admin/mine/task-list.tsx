import type { schema } from "@repo/database";
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
import { TaskListItem } from "./tasks/task-item";
import { TaskEmptyState } from "./tasks/task-empty-state";
import {
	type SortOption,
	priorityOrder,
	statusOrder,
} from "./tasks/task-sort-config";

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
	releases: schema.releaseType[];
}

export function MyTasksList({
	tasks,
	selectedTask,
	setSelectedTask,
	organizations,
	labels,
	categories,
	releases,
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
			return config.getOptions(tasks, labels, [], "", categories, releases);
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
		<div className="flex flex-col h-full min-h-0">
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
							releases={releases}
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
						releases={releases}
						renderFilterValue={renderFilterValue}
					/>
				</div>
			</div>

			{/* Task List */}
			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-1 p-1">
					{filteredAndSortedTasks.length === 0 ? (
						<TaskEmptyState hasFilters={activeFiltersCount > 0} />
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

"use client";

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { priorityConfig, statusConfig } from "../../shared/task-config";
import { FILTER_FIELD_CONFIGS } from "./filter-config";
import type { FilterCondition, FilterField, FilterGroup, FilterOperator, FilterState } from "./types";

interface TaskFilterDropdownProps {
	tasks: schema.TaskWithLabels[];
	labels: schema.labelType[];
	availableUsers: schema.userType[];
}

export function TaskFilterDropdown({ tasks, labels, availableUsers }: TaskFilterDropdownProps) {
	const { value: filterState, setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		{ groups: [], operator: "AND" },
		1
	);

	const [mainSearch, setMainSearch] = useState("");
	const [subSearch, setSubSearch] = useState("");
	const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

	const activeFiltersCount = useMemo(() => {
		return filterState.groups.reduce((count, group) => count + group.conditions.length, 0);
	}, [filterState]);

	// Reset sub-search when changing sub-menus
	const handleSubMenuChange = (fieldName: string | null) => {
		setOpenSubMenu(fieldName);
		if (fieldName !== openSubMenu) {
			setSubSearch("");
		}
	};

	// Helper function to render filter value with icons
	const renderFilterValue = (condition: FilterCondition) => {
		switch (condition.field) {
			case "status": {
				const statusValue = condition.value as keyof typeof statusConfig;
				const statusData = statusConfig[statusValue];
				return statusData ? (
					<>
						<div className="w-3 h-3">{statusData.icon("w-3 h-3")}</div>
						<span>{statusData.label}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "priority": {
				const priorityValue = condition.value as keyof typeof priorityConfig;
				const priorityData = priorityConfig[priorityValue];
				return priorityData ? (
					<>
						<div className="w-3 h-3">{priorityData.icon("w-3 h-3")}</div>
						<span>{priorityData.label}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "assignee": {
				const user = availableUsers.find(u => (u.name || u.email) === condition.value);
				return user ? (
					<>
						<Avatar className="h-3 w-3">
							<AvatarImage src={user.image || undefined} />
							<AvatarFallback className="text-[8px]">
								{(user.name || user.email || "U")
									?.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span>{user.name || user.email}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "label": {
				const label = labels.find(l => l.name === condition.value);
				return label ? (
					<>
						<div
							className="w-3 h-3 rounded-full shrink-0"
							style={{ backgroundColor: label.color || "#gray" }}
						/>
						<span>{label.name}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "creator": {
				const creator = availableUsers.find(u => (u.name || u.email) === condition.value);
				return creator ? (
					<>
						<Avatar className="h-3 w-3">
							<AvatarImage src={creator.image || undefined} />
							<AvatarFallback className="text-[8px]">
								{(creator.name || creator.email || "U")
									?.split(" ")
									.map((n) => n[0])
									.join("")
									.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span>{creator.name || creator.email}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "title": {
				return <span>{typeof condition.value === "string" ? condition.value : String(condition.value)}</span>;
			}
			case "created_at":
			case "updated_at": {
				const dateValue = condition.value instanceof Date 
					? condition.value.toLocaleDateString()
					: typeof condition.value === "string"
						? new Date(condition.value).toLocaleDateString()
						: String(condition.value);
				return <span>{dateValue}</span>;
			}
			default: {
				if (typeof condition.value === "string") {
					return <span>{condition.label || condition.value}</span>;
				}
				if (Array.isArray(condition.value)) {
					return <span>{condition.value.join(", ")}</span>;
				}
				if (condition.value instanceof Date) {
					return <span>{condition.value.toLocaleDateString()}</span>;
				}
				return <span>{String(condition.value)}</span>;
			}
		}
	};

	// Get human-readable operator labels for badges
	const getOperatorLabel = (operator: FilterOperator): string => {
		switch (operator) {
			case "equals":
				return "is";
			case "not_equals":
				return "is not";
			case "in":
				return "is any of";
			case "not_in":
				return "is none of";
			case "contains":
				return "contains";
			case "not_contains":
				return "does not contain";
			case "before":
				return "before";
			case "after":
				return "after";
			case "between":
				return "between";
			case "is_empty":
				return "is empty";
			case "is_not_empty":
				return "is not empty";
			default:
				return operator;
		}
	};

	// Add filter function
	const addFilter = (condition: FilterCondition) => {
		const newGroup: FilterGroup = {
			id: `group-${Date.now()}`,
			conditions: [condition],
			operator: "AND",
		};

		const newFilterState: FilterState = {
			...filterState,
			groups:
				filterState.groups.length > 0
					? filterState.groups.map((group, index) =>
							index === 0 ? { ...group, conditions: [...group.conditions, condition] } : group
						)
					: [newGroup],
		};

		setFilterState(newFilterState);
	};

	// Remove filter function
	const removeFilter = (filterId: string) => {
		const newFilterState: FilterState = {
			...filterState,
			groups: filterState.groups
				.map((group) => ({
					...group,
					conditions: group.conditions.filter((condition) => condition.id !== filterId),
				}))
				.filter((group) => group.conditions.length > 0),
		};

		setFilterState(newFilterState);
	};

	// Update filter operator function
	const updateFilterOperator = (filterId: string, newOperator: FilterOperator) => {
		const newFilterState: FilterState = {
			...filterState,
			groups: filterState.groups.map((group) => ({
				...group,
				conditions: group.conditions.map((condition) =>
					condition.id === filterId ? { ...condition, operator: newOperator } : condition
				),
			})),
		};

		setFilterState(newFilterState);
	};

	// Get available operators for a field
	const getAvailableOperators = (fieldName: FilterField): FilterOperator[] => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === fieldName);
		return config?.operators || ["equals"];
	};

	// Clear all filters
	const clearFilters = () => {
		setFilterState({ groups: [], operator: "AND" });
	};

	// Helper function to add a simple filter
	const handleFilterAdd = (field: string, operator: FilterOperator, value: string) => {
		const condition: FilterCondition = {
			id: `${field}-${operator}-${value}-${Date.now()}`,
			field: field as FilterField,
			operator,
			value,
		};
		addFilter(condition);
	};

	// Filter configs based on search
	const filteredConfigs = FILTER_FIELD_CONFIGS.filter(
		(config) =>
			config.label.toLowerCase().includes(mainSearch.toLowerCase()) ||
			config.field.toLowerCase().includes(mainSearch.toLowerCase())
	);

	// Get available statuses from shared config
	const getFilteredStatuses = () => {
		const statusOptions = Object.entries(statusConfig).map(([value, config]) => ({
			id: value,
			name: config.label,
			value,
			color: config.color,
			icon: config.icon("w-3 h-3"),
		}));
		return statusOptions.filter((status) => status.name.toLowerCase().includes(subSearch.toLowerCase()));
	};

	// Get available priorities from shared config
	const getFilteredPriorities = () => {
		const priorities = Object.entries(priorityConfig).map(([value, config]) => ({
			name: config.label,
			value,
			color: config.color,
			icon: config.icon("w-3 h-3"),
		}));
		return priorities.filter((priority) => priority.name.toLowerCase().includes(subSearch.toLowerCase()));
	};

	// Get filtered members
	const getFilteredMembers = () => {
		return availableUsers.filter(
			(user) =>
				user.name?.toLowerCase().includes(subSearch.toLowerCase()) ||
				user.email?.toLowerCase().includes(subSearch.toLowerCase())
		);
	};

	// Get filtered labels
	const getFilteredLabels = () => {
		return labels.filter((label) => label.name.toLowerCase().includes(subSearch.toLowerCase()));
	};

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{/* Filter Tags */}
			{filterState.groups.map((group) =>
				group.conditions.map((condition) => (
					<Badge
						key={condition.id}
						variant="outline"
						className="flex items-center gap-1 pr-1 h-9 rounded bg-accent"
					>
						<span className="text-xs flex items-center gap-1">
							<span>{FILTER_FIELD_CONFIGS.find((c) => c.field === condition.field)?.label}</span>

							{/* Clickable Operator */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-4 px-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
									>
										{getOperatorLabel(condition.operator)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-40">
									{getAvailableOperators(condition.field).map((operator) => (
										<DropdownMenuItem
											key={operator}
											className={`text-xs ${operator === condition.operator ? "bg-accent" : ""}`}
											onClick={() => updateFilterOperator(condition.id, operator)}
										>
											{getOperatorLabel(operator)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							{condition.value && condition.operator !== "is_empty" && condition.operator !== "is_not_empty" && (
								<span className="flex items-center gap-1">
									{renderFilterValue(condition)}
								</span>
							)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => removeFilter(condition.id)}
							className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
						>
							<IconX className="w-3 h-3" />
						</Button>
					</Badge>
				))
			)}

			{/* Filter Dropdown */}
			<DropdownMenu
				onOpenChange={(open) => {
					if (!open) {
						setMainSearch("");
						setSubSearch("");
						setOpenSubMenu(null);
					}
				}}
			>
				<DropdownMenuTrigger asChild>
					<Button variant="accent" size="icon" className={`gap-2 h-9 aspect-square`}>
						<IconFilter className="w-4 h-4" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
					{/* Main Search Input */}
					<div className="">
						<div className="relative">
							<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search filters..."
								value={mainSearch}
								onChange={(e) => setMainSearch(e.target.value)}
								className="pl-8 h-8 bg-transparent"
								variant={"ghost"}
							/>
						</div>
					</div>
					<DropdownMenuSeparator />

					{/* Clear All Button */}
					{activeFiltersCount > 0 && (
						<>
							<DropdownMenuItem onClick={clearFilters} className="text-destructive">
								<IconX className="w-4 h-4 mr-2" />
								Clear all filters
							</DropdownMenuItem>
							<DropdownMenuSeparator />
						</>
					)}

					{/* Filter Options with Sub-menus */}
					{Object.entries(
						filteredConfigs.reduce(
							(acc, config) => {
								const category = "Filters";
								if (!acc[category]) acc[category] = [];
								acc[category].push(config);
								return acc;
							},
							{} as Record<string, typeof filteredConfigs>
						)
					).map(([category, configs]) => (
						<div key={category}>
							<DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
								{category}
							</DropdownMenuLabel>
							{configs.map((config) => (
								<DropdownMenuSub key={config.field}>
									<DropdownMenuSubTrigger
										className="flex items-center gap-2"
										onClick={() => handleSubMenuChange(config.field)}
									>
										{config.icon}
										<span>{config.label}</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-56 max-h-80 overflow-y-auto">
										{/* Sub-menu search */}
										<div className="">
											<div className="relative">
												<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
												<Input
													placeholder={`Search ${config.label.toLowerCase()}...`}
													value={subSearch}
													onChange={(e) => setSubSearch(e.target.value)}
													className="pl-8 h-8 bg-transparent"
													variant={"ghost"}
												/>
											</div>
										</div>
										<DropdownMenuSeparator />

										{/* Status Filters */}
										{config.field === "status" && (
											<>
												{getFilteredStatuses().map((status) => (
													<DropdownMenuItem
														key={status.id}
														className="flex items-center gap-2 cursor-pointer"
														onClick={() => handleFilterAdd("status", "equals", status.value)}
													>
														<div className="w-3 h-3">{status.icon}</div>
														<span>{status.name}</span>
													</DropdownMenuItem>
												))}
											</>
										)}

										{/* Priority Filters */}
										{config.field === "priority" && (
											<>
												{getFilteredPriorities().map((priority) => (
													<DropdownMenuItem
														key={priority.value}
														className="flex items-center gap-2 cursor-pointer"
														onClick={() => handleFilterAdd("priority", "equals", priority.value)}
													>
														<div className="w-3 h-3">{priority.icon}</div>
														<span>{priority.name}</span>
													</DropdownMenuItem>
												))}
											</>
										)}

										{/* Assignee Filters */}
										{config.field === "assignee" && (
											<>
												{getFilteredMembers().map((user) => (
													<DropdownMenuItem
														key={user.id}
														className="flex items-center gap-2 cursor-pointer"
														onClick={() =>
															handleFilterAdd("assignee", "equals", user.name || user.email || "Unknown")
														}
													>
														<Avatar className="h-5 w-5">
															<AvatarImage src={user.image || undefined} />
															<AvatarFallback className="text-xs">
																{(user.name || user.email || "U")
																	?.split(" ")
																	.map((n) => n[0])
																	.join("")
																	.toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span>{user.name || user.email}</span>
													</DropdownMenuItem>
												))}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="cursor-pointer text-muted-foreground"
													onClick={() => handleFilterAdd("assignee", "is_empty", "")}
												>
													<span>Unassigned</span>
												</DropdownMenuItem>
											</>
										)}

										{/* Label Filters */}
										{config.field === "label" && (
											<>
												{getFilteredLabels().map((label) => (
													<DropdownMenuItem
														key={label.id}
														className="flex items-center gap-2 cursor-pointer"
														onClick={() => handleFilterAdd("label", "in", label.name)}
													>
														<div
															className="w-3 h-3 rounded-full shrink-0"
															style={{ backgroundColor: label.color || "#gray" }}
														/>
														<span className="truncate">{label.name}</span>
													</DropdownMenuItem>
												))}
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="cursor-pointer text-muted-foreground"
													onClick={() => handleFilterAdd("label", "is_empty", "")}
												>
													<span>No labels</span>
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							))}
						</div>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

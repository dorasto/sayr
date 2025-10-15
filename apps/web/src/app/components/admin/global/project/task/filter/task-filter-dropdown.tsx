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
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconFilter2, IconSearch, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";

// --- Serialization helpers (module scope so hooks ignore them as deps) ---
import type { FilterCondition, FilterGroup, FilterOperator, FilterState } from "./types";

const serializeFilters = (state: FilterState): string => {
	try {
		const minimal = state.groups.map((g) => g.conditions.map((c) => [c.field, c.operator, c.value]));
		if (minimal.length <= 0) {
			return "";
		}
		const json = JSON.stringify(minimal);
		return encodeURIComponent(Buffer.from(json, "utf-8").toString("base64"));
	} catch {
		return "";
	}
};

const deserializeFilters = (value: string): FilterState | null => {
	try {
		const decoded = Buffer.from(decodeURIComponent(value), "base64").toString("utf-8");
		const minimal: [string, FilterOperator, unknown][][] = JSON.parse(decoded);
		const groups: FilterGroup[] = minimal.map((conditions, gi) => ({
			id: `group-${gi}`,
			operator: "AND",
			conditions: conditions.map(([field, operator, val], ci) => ({
				id: `${field}-${operator}-${ci}-${Date.now()}`,
				field: field as FilterField,
				operator,
				value: val as FilterCondition["value"],
			})),
		}));
		return { groups, operator: "AND" };
	} catch {
		return null;
	}
};

import { priorityConfig, statusConfig } from "../../shared/task-config";
import { FILTER_FIELD_CONFIGS } from "./filter-config";
import type { FilterField } from "./types";

interface TaskFilterDropdownProps {
	tasks: schema.TaskWithLabels[];
	labels: schema.labelType[];
	availableUsers: schema.userType[];
}

export function TaskFilterDropdown({ tasks: _tasks, labels, availableUsers }: TaskFilterDropdownProps) {
	const [filters, setFilters] = useQueryState("filters", parseAsString.withDefault(""));
	const { value: filterState, setValue: setFilterState } = useStateManagement<FilterState>(
		"task-filters",
		deserializeFilters(filters) || { groups: [], operator: "AND" },
		1
	);

	const pathname = usePathname();

	useEffect(() => {
		const serialized = serializeFilters(filterState);
		setFilters(serialized);
	}, [filterState, setFilters]);

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
				const user = availableUsers.find((u) => u.id === condition.value);
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
				const label = labels.find((l) => l.id === condition.value);
				return label ? (
					<>
						<div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color || "#gray" }} />
						<span>{label.name}</span>
					</>
				) : (
					<span>{String(condition.value)}</span>
				);
			}
			case "creator": {
				const creator = availableUsers.find((u) => u.id === condition.value);
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
				const dateValue =
					condition.value instanceof Date
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
				return "not";
			case "in":
				return "any of";
			case "not_in":
				return "none of";
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

	// Utility helpers for multi-select
	const getFieldConfig = (field: FilterField) => FILTER_FIELD_CONFIGS.find((c) => c.field === field);
	const isMultiCondition = (c: FilterCondition) => {
		const cfg = getFieldConfig(c.field);
		return !!cfg?.multi && (c.operator === "in" || c.operator === "not_in");
	};

	// Add / merge filter function (supports multi conditions)
	const addFilter = (condition: FilterCondition) => {
		const cfg = getFieldConfig(condition.field);
		// Try to merge into existing condition if multi
		if (cfg?.multi && (condition.operator === "in" || condition.operator === "not_in")) {
			let merged = false;
			const newGroups = filterState.groups.map((g, gi) => {
				if (gi !== 0) return g; // only merge into first group for simplicity
				return {
					...g,
					conditions: g.conditions.map((c) => {
						if (c.field === condition.field && c.operator === condition.operator) {
							merged = true;
							const existingValues = Array.isArray(c.value) ? c.value : c.value ? [c.value as string] : [];
							if (!existingValues.includes(condition.value as string)) {
								return { ...c, value: [...existingValues, condition.value as string] };
							}
							return c; // no change if duplicate
						}
						return c;
					}),
				};
			});
			if (merged) {
				setFilterState({ ...filterState, groups: newGroups });
				return;
			}
		}

		// Otherwise add new condition as before
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
				conditions: group.conditions.map((condition) => {
					if (condition.id !== filterId) return condition;
					// If switching away from multi operator collapse array to first value
					if (!(newOperator === "in" || newOperator === "not_in") && Array.isArray(condition.value)) {
						return { ...condition, operator: newOperator, value: condition.value[0] ?? "" };
					}
					return { ...condition, operator: newOperator };
				}),
			})),
		};
		setFilterState(newFilterState);
	};

	// Toggle a value inside an existing multi condition
	const toggleMultiValue = (conditionId: string, value: string) => {
		const newFilterState: FilterState = {
			...filterState,
			groups: filterState.groups
				.map((group) => ({
					...group,
					conditions: group.conditions.map((c) => {
						if (c.id !== conditionId) return c;
						if (!isMultiCondition(c)) return c;
						const current = Array.isArray(c.value) ? c.value : c.value ? [c.value as string] : [];
						const exists = current.includes(value);
						const next = exists ? current.filter((v) => v !== value) : [...current, value];
						if (next.length === 0) {
							return { ...c, value: [] };
						}
						return { ...c, value: next };
					}),
				}))
				.map((g) => ({
					...g,
					conditions: g.conditions.filter((c) => !(Array.isArray(c.value) && c.value.length === 0)),
				}))
				.filter((g) => g.conditions.length > 0),
		};
		setFilterState(newFilterState);
	};

	// Get available operators for a field
	const getAvailableOperators = (fieldName: FilterField): FilterOperator[] => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === fieldName);
		return config?.operators || ["equals"];
	};

	// Get available options for a field
	const getAvailableOptions = (fieldName: FilterField) => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === fieldName);
		return typeof config?.getOptions === "function"
			? config.getOptions(_tasks, labels, availableUsers, subSearch)
			: [];
	};

	// Clear all filters
	const clearFilters = () => {
		setFilterState({ groups: [], operator: "AND" });
	};

	// Shareable view URL (memoized for clipboard component)
	const shareUrl = useMemo(() => {
		const serialized = serializeFilters(filterState);
		if (typeof window === "undefined") return "";
		return `${window.location.origin}${pathname}${serialized ? `?filters=${serialized}` : ""}`;
	}, [filterState, pathname]);

	// Helper function to add a simple filter (merges for multi fields)
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

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-2 flex-wrap">
				{/* Filter Tags */}
				{filterState.groups
					.flatMap((g) => g.conditions)
					.map((condition) => {
						const cfg = getFieldConfig(condition.field);
						const multi = isMultiCondition(condition);
						let multiDisplay: string | null = null;
						let displayNode: React.ReactNode = null;
						if (multi) {
							const rawValues = Array.isArray(condition.value)
								? condition.value
								: condition.value
									? [condition.value as string]
									: [];
							if (rawValues.length <= 2) {
								multiDisplay = rawValues
									.map((v) => {
										if (condition.field === "label") {
											const l = labels.find((x) => x.id === v);
											return l?.name || v;
										}
										if (condition.field === "status")
											return statusConfig[v as keyof typeof statusConfig]?.label || v;
										if (condition.field === "priority")
											return priorityConfig[v as keyof typeof priorityConfig]?.label || v;
										if (condition.field === "assignee") {
											const u = availableUsers.find((u) => u.id === v);
											return u?.name || u?.email || v;
										}
										return v;
									})
									.join(", ");
							} else {
								multiDisplay = `${rawValues.length} selected`;
							}
							if (condition.field === "label") {
								const labelObjs = rawValues
									.map((id) => labels.find((l) => l.id === id))
									.filter((l): l is (typeof labels)[number] => !!l);

								if (labelObjs.length === 0) {
									displayNode = null;
								} else if (labelObjs.length <= 2) {
									displayNode = (
										<span
											className="flex items-center gap-1 truncate"
											title={labelObjs.map((l) => l.name).join(", ")}
										>
											{labelObjs.map((l) => (
												<span key={l.id} className="flex items-center gap-1">
													<span
														className="w-2 h-2 rounded-full"
														style={{ backgroundColor: l.color || "#ccc" }}
													/>
													<span className="truncate max-w-[60px]">{l.name}</span>
												</span>
											))}
										</span>
									);
								} else {
									// >2 labels: show up to 5 colored dots + count
									const maxDots = 5;
									const shown = labelObjs.slice(0, maxDots);
									displayNode = (
										<span
											className="flex items-center gap-1 truncate"
											title={labelObjs.map((l) => l.name).join(", ")}
										>
											{shown.map((l) => (
												<span
													key={l.id}
													className="w-2.5 h-2.5 rounded-full border border-border/50"
													style={{ backgroundColor: l.color || "#ccc" }}
												/>
											))}
											{labelObjs.length > maxDots && (
												<span className="text-[10px] leading-none px-1 rounded bg-muted text-muted-foreground">
													+{labelObjs.length - maxDots}
												</span>
											)}
										</span>
									);
								}
							}
						}

						return (
							<Badge
								key={condition.id}
								variant="outline"
								className="flex items-center gap-1 bg-accent border-transparent rounded group h-6 relative pe-6"
							>
								<span className="text-xs flex items-center gap-1">
									<span className="">{cfg?.label}</span>
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

									{multi && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-4 px-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 max-w-[120px] truncate"
												>
													{displayNode || multiDisplay}
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
												{getAvailableOptions(condition.field).map((item) => {
													const selected = Array.isArray(condition.value)
														? condition.value.includes(item.value)
														: condition.value === item.value;
													return (
														<DropdownMenuItem
															key={item.value}
															className="flex items-center gap-2 text-xs cursor-pointer"
															onClick={(e) => {
																e.preventDefault();
																toggleMultiValue(condition.id, item.value);
															}}
														>
															{item.icon && <div className="w-3 h-3">{item.icon}</div>}
															{item.color && !item.icon && (
																<div
																	className="w-3 h-3 rounded-full shrink-0"
																	style={{ backgroundColor: item.color || "#gray" }}
																/>
															)}
															<span className="flex-1 truncate">{item.label}</span>
															{selected && <IconCheck className="w-3 h-3" />}
														</DropdownMenuItem>
													);
												})}
											</DropdownMenuContent>
										</DropdownMenu>
									)}

									{!multi &&
										condition.value &&
										condition.operator !== "is_empty" &&
										condition.operator !== "is_not_empty" && (
											<span className="flex items-center gap-1 truncate">
												{renderFilterValue(condition)}
											</span>
										)}
								</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeFilter(condition.id)}
									className="absolute inset-y-0 right-0.5 my-auto h-4 w-4 p-0 hover:text-destructive-foreground transition-all"
								>
									<IconX className="!w-3 !h-3" />
								</Button>
							</Badge>
						);
					})}
			</div>

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
					<Button
						variant="accent"
						className={cn("gap-2 h-6 w-fit bg-accent border-transparent p-1", activeFiltersCount > 0 && "w-6")}
					>
						<IconFilter2 className="w-4 h-4" />
						{activeFiltersCount <= 0 && <span className="text-xs">Filter</span>}
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
										{/* Filters SubMenu */}
										{getAvailableOptions(config.field).map((item, index) => (
											<DropdownMenuItem
												// biome-ignore lint/suspicious/noArrayIndexKey: <needed>
												key={`${item}-${index}`}
												className="flex items-center gap-2 cursor-pointer"
												onClick={() => handleFilterAdd(config.field, config.filterDefault, item.value)}
											>
												{item.image && (
													<Avatar className="h-5 w-5">
														<AvatarImage src={item.image || undefined} />
														<AvatarFallback className="text-xs">
															{(item.label || "U")
																?.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase()}
														</AvatarFallback>
													</Avatar>
												)}
												{item.icon && <div className="w-3 h-3">{item.icon}</div>}
												{item.color && !item.icon && (
													<div
														className="w-3 h-3 rounded-full shrink-0"
														style={{ backgroundColor: item.color || "#gray" }}
													/>
												)}
												<span className="truncate">{item.label}</span>
											</DropdownMenuItem>
										))}
										{config.empty && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													className="cursor-pointer text-muted-foreground"
													onClick={() => handleFilterAdd(config.field, "is_empty", "")}
												>
													<span>{config.empty}</span>
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
			{/* Share / Copy View Button (only show if filters active) */}
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

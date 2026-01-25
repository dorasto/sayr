"use client";

import { Button } from "@repo/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@repo/ui/components/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
// @ts-ignore
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconChevronDown, IconChevronRight, IconFilter2, IconSearch, IconX } from "@tabler/icons-react";
import { useMemo } from "react";
import type { FilterField, FilterFieldConfig, FilterOperator, FilterCondition } from "./types";

interface FilterMenuProps {
	activeFiltersCount: number;
	filteredConfigs: FilterFieldConfig[];
	mainSearch: string;
	setMainSearch: (v: string) => void;
	clearFilters: () => void;
	handleFilterAdd: (field: string, operator: FilterOperator, value: string) => void;
	getAvailableOptions: (field: FilterField) => {
		value: string;
		label: string;
		icon?: React.ReactNode;
		color?: string;
		image?: string;
	}[];
	getSelectedValues: (field: FilterField) => string[];
	conditions: FilterCondition[];
	removeFilter: (id: string) => void;
	updateFilterOperator: (id: string, op: FilterOperator) => void;
	toggleValue: (id: string, value: string) => void;
	getAvailableOperators: (field: FilterField) => FilterOperator[];
	labels: any[]; // schema.labelType[]
	availableUsers: any[]; // schema.userType[]
	categories: any[]; // schema.categoryType[]
	releases: any[]; // schema.releaseType[]
	renderFilterValue: (condition: FilterCondition) => React.ReactNode;
}

function formatSelectedLabels(selectedValues: string[], options: { value: string; label: string }[]) {
	const labelMap = new Map(options.map((o) => [o.value, o.label]));
	const emptyLabel = labelMap.get("__empty__") || "Empty";
	return selectedValues.map((value) => {
		if (value === "__empty__" || value === "") return emptyLabel;
		return labelMap.get(value) || value;
	});
}

function FilterComboBox({
	config,
	handleFilterAdd,
	getAvailableOptions,
	selectedValues,
}: {
	config: FilterFieldConfig;
	handleFilterAdd: FilterMenuProps["handleFilterAdd"];
	getAvailableOptions: FilterMenuProps["getAvailableOptions"];
	selectedValues: string[];
}) {
	const isMulti = !!config.multi;

	const options = useMemo(
		() =>
			config.empty
				? [...getAvailableOptions(config.field), { value: "__empty__", label: config.empty }]
				: getAvailableOptions(config.field),
		[config.empty, config.field, getAvailableOptions]
	);

	const displayLabels = useMemo(() => formatSelectedLabels(selectedValues, options), [options, selectedValues]);

	const summary =
		displayLabels.length === 0
			? config.label
			: displayLabels.length <= 2
				? displayLabels.join(", ")
				: `${displayLabels.slice(0, 2).join(", ")} +${displayLabels.length - 2}`;

	const comboValueProps = isMulti ? { values: selectedValues } : { value: selectedValues[0] || undefined };

	return (
		<ComboBox
			{...comboValueProps}
			onValueChange={
				isMulti
					? undefined
					: (value) => {
							if (!value) return;
							handleFilterAdd(config.field, config.filterDefault, value);
						}
			}
		>
			<ComboBoxTrigger className="w-full justify-between">
				<div className="flex items-center gap-2 text-sm">
					{config.icon}
					<span className={cn("truncate", displayLabels.length === 0 && "text-muted-foreground")}>{summary}</span>
				</div>
				<ComboBoxIcon />
			</ComboBoxTrigger>
			<ComboBoxContent className="w-full" align="start">
				<ComboBoxSearch placeholder={`Search ${config.label.toLowerCase()}...`} />
				<ComboBoxList>
					<ComboBoxEmpty>No options</ComboBoxEmpty>
					<ComboBoxGroup>
						{options.map((item, idx) => (
							<ComboBoxItem
								key={`${item.value}-${idx}`}
								value={item.value}
								onSelect={
									isMulti ? () => handleFilterAdd(config.field, config.filterDefault, item.value) : undefined
								}
								searchValue={`${item.label} ${item.value}`}
							>
								<div className="flex items-center gap-2">
									{item.icon && <div className="w-3 h-3">{item.icon}</div>}
									{item.color && !item.icon && (
										<div
											className="w-3 h-3 rounded-full shrink-0"
											style={{ backgroundColor: item.color || "#gray" }}
										/>
									)}
									<span className="truncate text-left text-sm">{item.label}</span>
								</div>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}

function getOperatorLabel(operator: FilterOperator): string {
	switch (operator) {
		case "any":
			return "Any of";
		case "all":
			return "All of";
		case "none":
			return "None of";
		case "exact":
			return "Exactly";
		case "contains":
			return "Contains";
		case "not_contains":
			return "Not contains";
		case "before":
			return "Before";
		case "after":
			return "After";
		case "between":
			return "Between";
		case "empty":
			return "Is empty";
		case "not_empty":
			return "Not empty";
		default:
			return operator;
	}
}

export function FilterMenu(props: FilterMenuProps) {
	const {
		activeFiltersCount,
		filteredConfigs,
		mainSearch,
		setMainSearch,
		clearFilters,
		handleFilterAdd,
		getAvailableOptions,
		getSelectedValues,
		conditions,
		removeFilter,
		updateFilterOperator,
		toggleValue,
		getAvailableOperators,
	} = props;

	const isMobile = useIsMobile();

	const groupedConfigs = useMemo(
		() =>
			filteredConfigs.reduce(
				(acc, config) => {
					const category = "Filters";
					if (!acc[category]) acc[category] = [];
					acc[category].push(config);
					return acc;
				},
				{} as Record<string, FilterFieldConfig[]>
			),
		[filteredConfigs]
	);

	const resetSearches = () => {
		setMainSearch("");
	};

	if (isMobile) {
		return (
			<Drawer
				onOpenChange={(open) => {
					if (!open) {
						resetSearches();
					}
				}}
			>
				<DrawerTrigger asChild>
					<Button variant="primary" className={cn("gap-2 h-6 w-fit p-1")}>
						<IconFilter2 className="w-4 h-4" />
						{activeFiltersCount > 0 && <span className="text-xs">{activeFiltersCount}</span>}
					</Button>
				</DrawerTrigger>
				<DrawerContent scroll={true}>
					<DrawerHeader className="flex items-center justify-between gap-2 pb-3 border-b sticky top-0 bg-background">
						<DrawerTitle className="text-base">Filters</DrawerTitle>
						{activeFiltersCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="h-8 px-2 text-xs text-destructive"
							>
								Clear all
							</Button>
						)}
					</DrawerHeader>
					<div className="px-4 py-4 space-y-4">
						{/* Active filters */}
						{conditions.length > 0 && (
							<div className="space-y-2">
								<div className="text-sm font-medium text-muted-foreground">Active ({conditions.length})</div>
								{conditions.map((condition) => {
									const cfg = filteredConfigs.find((c) => c.field === condition.field);

									// Type guard: only handle string and string[] values in mobile drawer
									const values: string[] = Array.isArray(condition.value)
										? condition.value.filter((v): v is string => typeof v === "string")
										: typeof condition.value === "string"
											? [condition.value]
											: [];

									const options = getAvailableOptions(condition.field);

									return (
										<Collapsible key={condition.id} defaultOpen={false}>
											<div className="border rounded-lg">
												<div className="flex items-center justify-between p-3">
													<CollapsibleTrigger asChild>
														<button
															type="button"
															className="group/trigger flex items-center gap-2 text-sm font-medium flex-1 text-left"
														>
															{cfg?.icon}
															<div className="flex flex-col items-start min-w-0 flex-1">
																<span className="text-xs text-muted-foreground">
																	{cfg?.label} · {getOperatorLabel(condition.operator)}
																</span>
																<span className="truncate w-full">
																	{formatSelectedLabels(values, options).length <= 2
																		? formatSelectedLabels(values, options).join(", ")
																		: `${formatSelectedLabels(values, options).slice(0, 2).join(", ")} +${formatSelectedLabels(values, options).length - 2}`}
																</span>
															</div>
															<IconChevronRight className="w-4 h-4 ml-auto shrink-0 transition-transform group-data-[state=open]/trigger:rotate-90" />
														</button>
													</CollapsibleTrigger>
													<button
														type="button"
														onClick={() => removeFilter(condition.id)}
														className="p-1 hover:bg-destructive/10 rounded ml-2"
													>
														<IconX className="w-4 h-4 text-muted-foreground hover:text-destructive" />
													</button>
												</div>

												<CollapsibleContent>
													<div className="px-3 pb-3 space-y-3 border-t pt-3">
														<div>
															<div className="text-xs text-muted-foreground mb-2">Operator</div>
															<div className="flex flex-wrap gap-2">
																{getAvailableOperators(condition.field).map((operator) => (
																	<Button
																		key={operator}
																		variant={operator === condition.operator ? "default" : "outline"}
																		size="sm"
																		onClick={() => updateFilterOperator(condition.id, operator)}
																	>
																		{getOperatorLabel(operator)}
																	</Button>
																))}
															</div>
														</div>

														{cfg?.multi && (
															<div>
																<div className="text-xs text-muted-foreground mb-2">Values</div>
																<div className="space-y-1">
																	{options.map((item) => {
																		const selected = values.includes(item.value);
																		return (
																			<button
																				type="button"
																				key={item.value}
																				onClick={() => toggleValue(condition.id, item.value)}
																				className={cn(
																					"flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary",
																					selected && "bg-muted"
																				)}
																			>
																				{item.icon && <div className="w-3 h-3">{item.icon}</div>}
																				{item.color && !item.icon && (
																					<div
																						className="w-3 h-3 rounded-full shrink-0"
																						style={{
																							backgroundColor: item.color || "#gray",
																						}}
																					/>
																				)}
																				<span className="flex-1 text-left truncate">
																					{item.label}
																				</span>
																			</button>
																		);
																	})}
																</div>
															</div>
														)}
													</div>
												</CollapsibleContent>
											</div>
										</Collapsible>
									);
								})}
							</div>
						)}

						{/* Add new filter */}
						<div className="space-y-2">
							<div className="text-sm font-medium text-muted-foreground">Add filter</div>
							<div className="space-y-2">
								{filteredConfigs.map((config) => (
									<FilterComboBox
										key={config.field}
										config={config}
										handleFilterAdd={handleFilterAdd}
										getAvailableOptions={getAvailableOptions}
										selectedValues={getSelectedValues(config.field)}
									/>
								))}
							</div>
						</div>
					</div>
					<DrawerFooter className="border-t pt-3 sticky bottom-0 bg-background">
						<DrawerClose asChild>
							<Button variant="primary" className="w-full">
								Done
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<DropdownMenu
			onOpenChange={(open) => {
				if (!open) {
					resetSearches();
				}
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button variant="primary" className={cn("gap-2 h-6 w-fit p-1", activeFiltersCount > 0 && "w-6")}>
					<IconFilter2 className="w-4 h-4" />
					{activeFiltersCount <= 0 && <span className="text-xs">Filter</span>}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				collisionPadding={16}
				className="w-64 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto"
			>
				<div className="relative">
					<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search filters..."
						value={mainSearch}
						onChange={(e) => setMainSearch(e.target.value)}
						className="pl-8 h-8 bg-transparent"
						variant="ghost"
					/>
				</div>
				<DropdownMenuSeparator />
				{activeFiltersCount > 0 && (
					<>
						<DropdownMenuItem onClick={clearFilters} className="text-destructive">
							<IconX className="w-4 h-4 mr-2" />
							Clear all filters
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				{Object.entries(groupedConfigs).map(([category, configs]) => (
					<div key={category} className="space-y-2">
						<DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
							{category}
						</DropdownMenuLabel>
						<div className="space-y-2">
							{configs.map((config) => (
								<div key={config.field} className="px-1">
									<FilterComboBox
										config={config}
										handleFilterAdd={handleFilterAdd}
										getAvailableOptions={getAvailableOptions}
										selectedValues={getSelectedValues(config.field)}
									/>
								</div>
							))}
						</div>
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

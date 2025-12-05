"use client";

import type { schema } from "@repo/database";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@repo/ui/components/command";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { FilterBadges } from "../../global/org/tasks/task/filter/dropdown/FilterBadges";
import {
	mergeOrAppendCondition,
	toggleMultiValue as toggleValueHelper,
	updateConditionOperator,
} from "../../global/org/tasks/task/filter/dropdown/multi-select";
import { deserializeFilters, serializeFilters } from "../../global/org/tasks/task/filter/dropdown/serialization";
import { FILTER_FIELD_CONFIGS } from "../../global/org/tasks/task/filter/filter-config";
import type {
	FilterCondition,
	FilterField,
	FilterGroup,
	FilterOperator,
	FilterState,
} from "../../global/org/tasks/task/filter/types";

interface ViewFilterEditorProps {
	initialFilterParams: string;
	onChange: (newFilterParams: string) => void;
	labels: schema.labelType[];
	availableUsers: schema.userType[];
	categories: schema.categoryType[];
	tasks: schema.TaskWithLabels[];
}

export function ViewFilterEditor({
	initialFilterParams,
	onChange,
	labels,
	availableUsers,
	categories,
	tasks,
}: ViewFilterEditorProps) {
	const [filterState, setFilterState] = useState<FilterState>(
		deserializeFilters(initialFilterParams) || { groups: [], operator: "AND" }
	);
	const inputRef = useRef<HTMLInputElement>(null);
	const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [viewStack, setViewStack] = useState<string[]>(["root"]);
	const activeView = viewStack[viewStack.length - 1] || "root";

	// Sync initial params if they change externally
	useEffect(() => {
		const newState = deserializeFilters(initialFilterParams);
		if (newState) {
			setFilterState((prev) => {
				if (serializeFilters(newState) !== serializeFilters(prev)) {
					return newState;
				}
				return prev;
			});
		}
	}, [initialFilterParams]);

	// Notify parent on change
	useEffect(() => {
		const serialized = serializeFilters(filterState);
		if (serialized !== initialFilterParams) {
			onChange(serialized);
		}
	}, [filterState, onChange, initialFilterParams]);

	// Helpers
	const addFilter = (condition: FilterCondition) => {
		setFilterState((prev) => mergeOrAppendCondition(prev, condition));
	};

	const removeFilter = (filterId: string) => {
		setFilterState((prev) => {
			const newGroups: FilterGroup[] = prev.groups
				.map((g: FilterGroup) => ({
					...g,
					conditions: g.conditions.filter((c: FilterCondition) => c.id !== filterId),
				}))
				.filter((g: FilterGroup) => g.conditions.length > 0);
			return { ...prev, groups: newGroups };
		});
	};

	const updateFilterOperator = (filterId: string, op: FilterOperator) => {
		setFilterState((prev) => updateConditionOperator(prev, filterId, op));
	};

	const toggleMultiValue = (conditionId: string, value: string) => {
		setFilterState((prev) => toggleValueHelper(prev, conditionId, value));
	};

	const getAvailableOperators = (field: FilterField): FilterOperator[] => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
		return config?.operators || ["any"];
	};

	const getAvailableOptions = (field: FilterField) => {
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
		return typeof config?.getOptions === "function"
			? config.getOptions(tasks, labels, availableUsers, "", categories)
			: [];
	};

	const handleFieldSelect = (field: FilterField) => {
		if (blurTimeoutRef.current) {
			clearTimeout(blurTimeoutRef.current);
			blurTimeoutRef.current = null;
		}
		setViewStack((prev) => [...prev, field]);
		setInputValue("");
		setOpen(true);
		// Keep focus
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	const handleOptionSelect = (value: string) => {
		const field = activeView as FilterField;
		const config = FILTER_FIELD_CONFIGS.find((c) => c.field === field);
		const operator = config?.filterDefault || "any";

		addFilter({
			id: `${field}-${operator}-${value}-${Date.now()}`,
			field: field,
			operator,
			value,
		});

		setViewStack(["root"]);
		setInputValue("");
		setOpen(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Backspace" && !inputValue && viewStack.length > 1) {
			e.preventDefault();
			setViewStack((prev) => prev.slice(0, -1));
		}
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

	return (
		<Command
			onKeyDown={handleKeyDown}
			className="overflow-visible bg-transparent border rounded-md [&_[cmdk-input-wrapper]]:border-none [&_[cmdk-input-wrapper]]:px-2 [&_[cmdk-input-wrapper]]:flex-wrap [&_[cmdk-input-wrapper]]:h-auto [&_[cmdk-input-wrapper]]:py-1"
		>
			<CommandInput
				ref={inputRef}
				value={inputValue}
				onValueChange={setInputValue}
				onFocus={() => {
					if (blurTimeoutRef.current) {
						clearTimeout(blurTimeoutRef.current);
						blurTimeoutRef.current = null;
					}
					setOpen(true);
				}}
				onBlur={() => {
					blurTimeoutRef.current = setTimeout(() => setOpen(false), 200);
				}}
				placeholder={activeView === "root" ? "Filter..." : `Select ${activeView}...`}
				className="h-8 min-w-[120px] focus-visible:outline-0"
				icon={
					<div className="mr-2 flex items-center gap-1">
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
							categories={categories}
						/>
					</div>
				}
			/>
			<div className="relative">
				{open && (
					<div className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
						<CommandList>
							{activeView === "root" && (
								<CommandGroup heading="Available Filters">
									{FILTER_FIELD_CONFIGS.map((config) => (
										<CommandItem
											key={config.field}
											value={config.label}
											onSelect={() => handleFieldSelect(config.field)}
											className="cursor-pointer"
										>
											{config.icon && <div className="mr-2 h-4 w-4">{config.icon}</div>}
											<span>{config.label}</span>
										</CommandItem>
									))}
								</CommandGroup>
							)}
							{activeView !== "root" && (
								<>
									<CommandGroup heading={`Select ${activeView}...`}>
										{getAvailableOptions(activeView as FilterField).map((option, idx) => (
											<CommandItem
												key={`${option.value}-${idx}`}
												value={option.label}
												onSelect={() => handleOptionSelect(option.value)}
												className="cursor-pointer"
											>
												{option.icon && <div className="mr-2 h-4 w-4">{option.icon}</div>}
												{option.color && !option.icon && (
													<div
														className="mr-2 h-3 w-3 rounded-full"
														style={{ backgroundColor: option.color }}
													/>
												)}
												<span>{option.label}</span>
											</CommandItem>
										))}
									</CommandGroup>
									<CommandSeparator />
									<CommandGroup heading="Navigation">
										<CommandItem
											value="Go back"
											onSelect={() => {
												setViewStack((prev) => prev.slice(0, -1));
												setInputValue("");
											}}
											className="cursor-pointer"
										>
											<IconArrowLeft className="mr-2 h-4 w-4" />
											<span>Go back</span>
										</CommandItem>
									</CommandGroup>
								</>
							)}
						</CommandList>
					</div>
				)}
			</div>
		</Command>
	);
}

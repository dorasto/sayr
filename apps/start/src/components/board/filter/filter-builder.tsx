"use client";

import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { cn } from "@repo/ui/lib/utils";
import { IconFilter, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { FilterBuilderConditionRow } from "./filter-builder-condition-row";
import { FIELD_CONFIGS } from "./filter-config";
import type { FilterCondition, FilterState, FilterValue } from "./types";
import { useBoardViewState } from "./use-board-view-state";

// Date-range fields (created/updated) need their own start/end UI — a
// meaningfully separate piece of work, not built yet. Every other field —
// every multi-select field plus the plain-text "title" field — is fully
// wired in FilterBuilderConditionRow.
const ADDABLE_FIELDS = FIELD_CONFIGS.filter((config) => config.field !== "created_at" && config.field !== "updated_at");

function updateConditionValue(filters: FilterState, conditionId: string, value: FilterValue): FilterState {
	return {
		...filters,
		groups: filters.groups.map((group) => ({
			...group,
			conditions: group.conditions.map((condition) =>
				condition.id === conditionId ? { ...condition, value } : condition
			),
		})),
	};
}

/**
 * The condition list + "add filter" picker + clear-all — extracted from the
 * popover shell so board-side-panel.tsx can render the exact same content
 * inline, not just the compact trigger version. Conditions always live in a
 * single AND-ed group; useBoardViewState's addFilter/mergeOrAppendCondition
 * already only ever operate on groups[0], so there's no group/OR management
 * UI here — matches how the underlying state is actually shaped.
 */
export function FilterBuilderContent() {
	const { filters, setFilters, addFilter, removeFilter, updateFilterOperator, clearFilters } = useBoardViewState();
	const [addOpen, setAddOpen] = useState(false);

	const conditions: FilterCondition[] = filters.groups[0]?.conditions ?? [];
	const activeFields = new Set(conditions.map((condition) => condition.field));

	const handleAddField = (field: string | null) => {
		if (!field) return;
		const config = ADDABLE_FIELDS.find((c) => c.field === field);
		if (!config) return;
		addFilter({
			id: `filter-${field}-${Date.now()}`,
			field: config.field,
			operator: config.filterDefault,
			value: config.multi ? [] : "",
		});
		setAddOpen(false);
	};

	return (
		<>
			<div className="flex flex-col divide-y divide-border">
				{conditions.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">No filters yet.</p>}
				{conditions.map((condition) => (
					<FilterBuilderConditionRow
						key={condition.id}
						condition={condition}
						onOperatorChange={(operator) => updateFilterOperator(condition.id, operator)}
						onValuesChange={(values) => setFilters(updateConditionValue(filters, condition.id, values))}
						onTextChange={(value) => setFilters(updateConditionValue(filters, condition.id, value))}
						onRemove={() => removeFilter(condition.id)}
					/>
				))}
			</div>
			<div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-border">
				<ComboBox open={addOpen} onOpenChange={setAddOpen} onValueChange={handleAddField}>
					<ComboBoxTrigger asChild>
						<button
							type="button"
							className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
						>
							<IconPlus className="size-3.5" />
							Add filter
						</button>
					</ComboBoxTrigger>
					<ComboBoxContent align="start">
						<ComboBoxSearch placeholder="Search fields..." />
						<ComboBoxList>
							<ComboBoxEmpty>No fields found.</ComboBoxEmpty>
							<ComboBoxGroup>
								{ADDABLE_FIELDS.map((config) => (
									<ComboBoxItem
										key={config.field}
										value={config.field}
										searchValue={config.label}
										disabled={activeFields.has(config.field)}
										showCheck={false}
									>
										{config.icon}
										<span>{config.label}</span>
									</ComboBoxItem>
								))}
							</ComboBoxGroup>
						</ComboBoxList>
					</ComboBoxContent>
				</ComboBox>
				{conditions.length > 0 && (
					<button
						type="button"
						onClick={clearFilters}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						Clear all
					</button>
				)}
			</div>
		</>
	);
}

/** The filter builder's compact top-bar form — a trigger button + popover wrapping FilterBuilderContent. */
export function FilterBuilder() {
	const { filters } = useBoardViewState();
	const conditions: FilterCondition[] = filters.groups[0]?.conditions ?? [];

	return (
		<ComboBox>
			<ComboBoxTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-1.5 h-6 px-2 shrink-0 rounded-full text-xs border transition-colors",
						conditions.length > 0
							? "bg-primary/10 border-primary text-primary"
							: "border-border text-muted-foreground hover:bg-accent"
					)}
				>
					<IconFilter className="size-3.5" />
					Filter
					{conditions.length > 0 && (
						<span className="rounded-full bg-primary text-primary-foreground text-[10px] size-4 grid place-items-center">
							{conditions.length}
						</span>
					)}
				</button>
			</ComboBoxTrigger>
			<ComboBoxContent className="w-80 p-2" align="start">
				<FilterBuilderContent />
			</ComboBoxContent>
		</ComboBox>
	);
}

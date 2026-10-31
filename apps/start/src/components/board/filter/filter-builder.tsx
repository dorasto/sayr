"use client";

import { Button } from "@repo/ui/components/button";
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
import { IconFilter, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useBoardEntity, useBoardOrganizationScope } from "../core/board-data";
import { FilterBuilderConditionRow } from "./filter-builder-condition-row";
import type { FilterCondition, FilterState, FilterValue } from "./types";
import { useBoardViewState } from "./use-board-view-state";

/**
 * The fields "Add filter" offers: the board entity's filter fields minus those marked `addable: false`
 * (tasks' created/updated dates), and minus `org` on a single-org board (nothing to filter by).
 */
function useAddableFilterFields() {
	const { filterFields } = useBoardEntity();
	const singleOrg = useBoardOrganizationScope() !== undefined;
	return useMemo(
		() => filterFields.filter((config) => config.addable !== false && !(singleOrg && config.field === "org")),
		[filterFields, singleOrg]
	);
}

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
	const addableFields = useAddableFilterFields();

	const conditions: FilterCondition[] = filters.groups[0]?.conditions ?? [];
	const activeFields = new Set(conditions.map((condition) => condition.field));

	const handleAddField = (field: string | null) => {
		if (!field) return;
		const config = addableFields.find((c) => c.field === field);
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
						onDateChange={(value) => setFilters(updateConditionValue(filters, condition.id, value))}
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
								{addableFields.map((config) => (
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

/**
 * The filter builder's compact top-bar form — an icon-only trigger (same look as BoardViewOptions' sliders button
 * beside it, with a small dot while filters are active) + popover wrapping FilterBuilderContent.
 */
export function FilterBuilder() {
	const { filters } = useBoardViewState();
	const [open, setOpen] = useState(false);
	const conditions: FilterCondition[] = filters.groups[0]?.conditions ?? [];

	return (
		<ComboBox open={open} onOpenChange={setOpen}>
			<ComboBoxTrigger asChild>
				<Button
					type="button"
					variant={open ? "secondary" : "ghost"}
					size={"sm"}
					data-command-target="filter-builder-trigger"
					aria-label="Filter"
					title="Filter"
					className="relative gap-2 h-6 w-6 p-1"
				>
					<IconFilter className="w-4 h-4" />
					{conditions.length > 0 && (
						<span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary" />
					)}
				</Button>
			</ComboBoxTrigger>
			<ComboBoxContent className="w-80 p-2" align="start">
				<FilterBuilderContent />
			</ComboBoxContent>
		</ComboBox>
	);
}

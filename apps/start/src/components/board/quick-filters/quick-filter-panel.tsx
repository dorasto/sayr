"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { getInitials } from "@repo/util";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBoardData, useBoardFilterUsers } from "../core/board-data";
import { LabelBadge } from "../fields/label-badge";
import { applyFilters, buildFieldValueCounts, FIELD_CONFIGS } from "../filter/filter-config";
import { toggleFieldValues } from "../filter/multi-select";
import type { FilterField, FilterOption, FilterState } from "../filter/types";
import { useBoardViewState } from "../filter/use-board-view-state";

// The multi-value, cross-task "browse and narrow" fields — status/priority are already the
// board's own primary grouping/columns, so they're not repeated here as a facet.
const QUICK_FILTER_FIELDS: FilterField[] = ["label", "org", "category", "assignee", "release"];

function excludeField(filters: FilterState, field: FilterField): FilterState {
	return {
		...filters,
		groups: filters.groups
			.map((group) => ({
				...group,
				conditions: group.conditions.filter((c) => c.field !== field),
			}))
			.filter((group) => group.conditions.length > 0),
	};
}

type CountedOption = FilterOption & { count: number };

interface ScrollEdges {
	/** More content hidden to the left. */
	start: boolean;
	/** More content hidden to the right. */
	end: boolean;
}

/** Tracks whether a horizontal scroller has hidden content on either side (on scroll and on resize). */
function useScrollEdges() {
	const ref = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false });
	const update = useCallback(() => {
		const el = ref.current;
		if (!el) return;
		const next = { start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 };
		setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
	}, []);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		update();
		const observer = new ResizeObserver(update);
		observer.observe(el);
		return () => observer.disconnect();
	}, [update]);
	return { ref, edges, update };
}

/** A mask that fades 1.5rem at each edge that has more to scroll to; none when both sides are flush. */
function edgeFadeMask({ start, end }: ScrollEdges): string | undefined {
	if (!start && !end) return undefined;
	const left = start ? "transparent, #000 1.5rem" : "#000";
	const right = end ? "#000 calc(100% - 1.5rem), transparent" : "#000";
	return `linear-gradient(to right, ${left}, ${right})`;
}

/**
 * Linear-style faceted quick filters for the right panel: pick a field, see every value that
 * still has at least one matching task (given every OTHER active filter — not this field's own
 * current selection, so picking a second label doesn't zero out the rest of the Label tab),
 * sorted by count. Clicking a row toggles it into the board's real filter state via the same
 * multi-select condition shape FilterBuilderConditionRow uses, so this and the full filter
 * builder always agree on what's selected.
 */
export function QuickFilterPanel() {
	const { items: tasks, labels, categories, releases } = useBoardData();
	const { filters, setFilters, showCompletedTasks } = useBoardViewState();
	const [activeField, setActiveField] = useState<FilterField>(QUICK_FILTER_FIELDS[0] as FilterField);
	const { ref: tabStripRef, edges: tabEdges, update: updateTabEdges } = useScrollEdges();

	const users = useBoardFilterUsers();

	const config = FIELD_CONFIGS.find((c) => c.field === activeField);

	const baseTasks = useMemo(() => {
		const filtered = applyFilters(tasks, excludeField(filters, activeField));
		return showCompletedTasks
			? filtered
			: filtered.filter((task) => task.status !== "done" && task.status !== "canceled");
	}, [tasks, filters, activeField, showCompletedTasks]);

	const counts = useMemo(() => buildFieldValueCounts(baseTasks, activeField), [baseTasks, activeField]);

	const options = useMemo<CountedOption[]>(() => {
		if (!config?.getOptions) return [];
		return config
			.getOptions(tasks, labels, users, "", categories, releases)
			.map((option) => ({
				...option,
				count: (option.mergedValues ?? [option.value]).reduce((sum, v) => sum + (counts.get(v) ?? 0), 0),
			}))
			.filter((option) => option.count > 0)
			.sort((a, b) => b.count - a.count);
	}, [config, tasks, labels, users, categories, releases, counts]);

	const activeCondition = filters.groups.flatMap((group) => group.conditions).find((c) => c.field === activeField);
	const selectedValues = Array.isArray(activeCondition?.value)
		? activeCondition.value
		: activeCondition?.value
			? [String(activeCondition.value)]
			: [];

	const handleToggle = (option: CountedOption) => {
		if (!config) return;
		setFilters(toggleFieldValues(filters, activeField, config.filterDefault, option.mergedValues ?? [option.value]));
	};

	return (
		<div className="flex flex-col gap-2">
			{/* Compact, scrollbar-less tab strip: the tabs used to be Button's default height (40px) plus an always-visible
			    10px scrollbar because five tabs overflow the panel. Each edge fades only while there's more to scroll to on
			    that side (see useScrollEdges), so nothing is ever faded when all the tabs fit. */}
			<div
				ref={tabStripRef}
				onScroll={updateTabEdges}
				className="scrollbar-hide flex items-center gap-1 overflow-x-auto"
				style={{ maskImage: edgeFadeMask(tabEdges), WebkitMaskImage: edgeFadeMask(tabEdges) }}
			>
				{QUICK_FILTER_FIELDS.map((field) => {
					const fieldConfig = FIELD_CONFIGS.find((c) => c.field === field);
					if (!fieldConfig) return null;
					return (
						<Button
							key={field}
							type="button"
							variant={activeField === field ? "secondary" : "ghost"}
							onClick={() => setActiveField(field)}
							className={cn(
								"h-7 shrink-0 rounded-full px-2.5 py-0 text-xs transition-colors",
								activeField === field
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							{fieldConfig.label}
						</Button>
					);
				})}
			</div>
			<div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
				{options.length === 0 && (
					<p className="px-1 py-2 text-xs text-muted-foreground">Nothing to filter by here.</p>
				)}
				{options.map((option) => {
					const isSelected = (option.mergedValues ?? [option.value]).every((v) => selectedValues.includes(v));
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => handleToggle(option)}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
								isSelected ? "bg-accent" : "hover:bg-accent/50"
							)}
						>
							{option.image !== undefined ? (
								<Avatar className="size-4 shrink-0">
									<AvatarImage src={option.image || undefined} alt={option.label} />
									<AvatarFallback className="text-[8px]">{getInitials(option.label)}</AvatarFallback>
								</Avatar>
							) : option.color ? (
								activeField === "label" ? (
									<LabelBadge
										label={{ name: option.label, color: option.color, visible: option.visible }}
										showName={false}
									/>
								) : (
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: option.color }}
										aria-hidden="true"
									/>
								)
							) : (
								option.icon
							)}
							<span className="flex-1 truncate">{option.label}</span>
							{option.orgName && (
								<span className="max-w-16 shrink-0 truncate text-[10px] text-muted-foreground">
									{option.orgName}
								</span>
							)}
							<span className="shrink-0 tabular-nums text-muted-foreground">{option.count}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

import { authClient } from "@repo/auth/client";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useMemo } from "react";
import { useBoardViewState } from "../filter/use-board-view-state";
import { QUICK_FILTERS } from "./quick-filter-config";

/**
 * One-click filter presets. Each chip replaces the whole filter state with
 * its own single condition (via applyFilter) rather than merging into
 * whatever the filter builder has open — quick filters are presets, not an
 * additive layer on top of manual filtering. Clicking an already-active
 * chip clears filters instead of doing nothing, so it doubles as an off
 * switch.
 */
export function QuickFilterChips() {
	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;
	const { filters, applyFilter, clearFilters } = useBoardViewState();

	const activeId = useMemo(() => {
		const group = filters.groups.length === 1 ? filters.groups[0] : undefined;
		const conditionId = group?.conditions.length === 1 ? group.conditions[0]?.id : undefined;
		if (!conditionId) return null;
		return QUICK_FILTERS.find((definition) => conditionId === `quick-${definition.id}`)?.id ?? null;
	}, [filters]);

	const handleValueChange = (values: string[]) => {
		const nextId = values[0];
		if (!nextId) {
			clearFilters();
			return;
		}
		const definition = QUICK_FILTERS.find((d) => d.id === nextId);
		if (!definition) return;
		applyFilter({
			groups: [
				{
					id: "quick",
					operator: "AND",
					conditions: [
						{
							...definition.buildCondition(userId ?? ""),
							id: `quick-${definition.id}`,
						},
					],
				},
			],
			operator: "AND",
		});
	};

	return (
		<ToggleGroup value={activeId ? [activeId] : []} onValueChange={handleValueChange} className="gap-1.5 shrink-0">
			{QUICK_FILTERS.map((definition) => {
				if (definition.requiresUser && !userId) return null;
				return (
					<ToggleGroupItem
						key={definition.id}
						value={definition.id}
						className="flex items-center gap-1.5 h-6 px-2 shrink-0 rounded-full text-xs border border-border text-muted-foreground data-pressed:bg-primary/10 data-pressed:border-primary data-pressed:text-primary"
					>
						{definition.icon}
						{definition.label}
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}

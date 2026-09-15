"use client";

import { authClient } from "@repo/auth/client";
import { cn } from "@repo/ui/lib/utils";
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

	const handleToggle = (definitionId: string) => {
		if (activeId === definitionId) {
			clearFilters();
			return;
		}
		const definition = QUICK_FILTERS.find((d) => d.id === definitionId);
		if (!definition) return;
		applyFilter({
			groups: [
				{
					id: "quick",
					operator: "AND",
					conditions: [{ ...definition.buildCondition(userId ?? ""), id: `quick-${definition.id}` }],
				},
			],
			operator: "AND",
		});
	};

	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{QUICK_FILTERS.map((definition) => {
				if (definition.requiresUser && !userId) return null;
				const isActive = activeId === definition.id;
				return (
					<button
						key={definition.id}
						type="button"
						onClick={() => handleToggle(definition.id)}
						className={cn(
							"flex items-center gap-1.5 h-6 px-2 shrink-0 rounded-full text-xs border transition-colors",
							isActive
								? "bg-primary/10 border-primary text-primary"
								: "border-border text-muted-foreground hover:bg-accent"
						)}
					>
						{definition.icon}
						{definition.label}
					</button>
				);
			})}
		</div>
	);
}

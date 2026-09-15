"use client";

import { useStore } from "@tanstack/react-store";
import { IconLayoutSidebarRight } from "@tabler/icons-react";
import { userPreferencesActions, userPreferencesStore } from "@/lib/stores/user-preferences-store";
import { FilterBuilder } from "../filter/filter-builder";
import { QuickFilterChips } from "../quick-filters/quick-filter-chips";
import { PresetSwitcher } from "../saved-views/preset-switcher";

/**
 * Renders whichever of {PresetSwitcher, FilterBuilder} the landerLayout
 * preference assigns to the top bar — the other one renders inline in
 * BoardSidePanel instead. Quick filter chips always stay here regardless
 * of layout; they're not part of the swap. Page-agnostic — reads/writes
 * only the localStorage-backed preference store, no dependency on a
 * specific page's panel id (that lives in the page itself, e.g.
 * pages/admin/home/index.tsx).
 */
export function BoardTopBar() {
	const landerLayout = useStore(userPreferencesStore, (state) => state.landerLayout);

	return (
		<div className="flex items-center gap-2 flex-wrap max-w-full overflow-x-auto">
			{landerLayout === "presetTop" ? <PresetSwitcher /> : <FilterBuilder />}
			<div className="h-4 w-px bg-border shrink-0" />
			<QuickFilterChips />
			<button
				type="button"
				onClick={() =>
					userPreferencesActions.setLanderLayout(landerLayout === "presetTop" ? "presetSide" : "presetTop")
				}
				title={landerLayout === "presetTop" ? "Move views to the side panel" : "Move filters to the side panel"}
				className="flex items-center justify-center size-6 shrink-0 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
			>
				<IconLayoutSidebarRight className="size-3.5" />
			</button>
		</div>
	);
}

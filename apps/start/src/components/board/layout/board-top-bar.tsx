"use client";

import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";
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
		// flex-nowrap (not flex-wrap) is the actual fix here: flex-wrap lets the
		// row grow onto new lines instead of overflowing horizontally, which
		// means overflow-x-auto never gets a chance to trigger at all — content
		// just wraps (and on a fixed-height toolbar, clips/overlaps) instead of
		// scrolling. Forked from filter-badges.tsx's own "flex-wrap ... overflow-x-auto"
		// combo (same contradiction, just never exercised there — a single-org
		// page rarely has enough badges to overflow) rather than copied as-is.
		<div className="flex flex-row flex-nowrap items-center shrink-0 gap-2 max-w-full overflow-x-auto">
			{landerLayout === "presetTop" ? <PresetSwitcher /> : <FilterBuilder />}
			<Separator orientation="vertical" className="h-4" />
			<QuickFilterChips />
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={() =>
					userPreferencesActions.setLanderLayout(landerLayout === "presetTop" ? "presetSide" : "presetTop")
				}
				tooltipText={
					landerLayout === "presetTop" ? "Move views to the side panel" : "Move filters to the side panel"
				}
				className="size-6 shrink-0 rounded-full"
			>
				<IconLayoutSidebarRight className="size-3.5" />
			</Button>
		</div>
	);
}

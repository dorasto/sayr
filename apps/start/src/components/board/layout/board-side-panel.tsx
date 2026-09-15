"use client";

import { useStore } from "@tanstack/react-store";
import { userPreferencesStore } from "@/lib/stores/user-preferences-store";
import { FilterBuilderContent } from "../filter/filter-builder";
import { PresetSwitcherContent } from "../saved-views/preset-switcher";
import { SaveViewPopover } from "../saved-views/save-view-popover";

/**
 * Renders whichever of {FilterBuilderContent, PresetSwitcherContent} the
 * landerLayout preference didn't already assign to BoardTopBar — the inline
 * (non-popover) form of the same component. Page-agnostic: takes no props,
 * meant to be handed to a page's own panel via setPanelContent (see the
 * page-component skill) — the panel id/registration itself is the page's
 * concern, not board's.
 */
export function BoardSidePanelContent() {
	const landerLayout = useStore(userPreferencesStore, (state) => state.landerLayout);

	return (
		<div className="flex flex-col gap-2 p-3">
			{landerLayout === "presetTop" ? (
				<FilterBuilderContent />
			) : (
				<>
					<PresetSwitcherContent />
					<div className="pt-2 mt-1 border-t border-border">
						<SaveViewPopover />
					</div>
				</>
			)}
		</div>
	);
}

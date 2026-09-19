import { useStore } from "@tanstack/react-store";
import { userPreferencesStore } from "@/lib/stores/user-preferences-store";
import { FilterBuilderContent } from "../filter/filter-builder";
import { QuickFilterPanel } from "../quick-filters/quick-filter-panel";
import { PresetSwitcherContent } from "../saved-views/preset-switcher";
import { SaveViewPopover } from "../saved-views/save-view-popover";

/**
 * QuickFilterPanel always leads the panel now — the new faceted "pick a value, see the count"
 * browser (see its own doc comment). Below it, still whichever of {FilterBuilderContent,
 * PresetSwitcherContent} the landerLayout preference didn't already assign to BoardTopBar —
 * that swap is unchanged/undecided (the user hasn't said what happens to it yet), so this is
 * additive, not a replacement: pin/edit/delete view management still only lives in
 * PresetSwitcherContent, nowhere else has it. Page-agnostic: takes no props, meant to be handed
 * to a page's own panel via setPanelContent (see the page-component skill) — the panel
 * id/registration itself is the page's concern, not board's.
 */
export function BoardSidePanelContent() {
  const landerLayout = useStore(
    userPreferencesStore,
    (state) => state.landerLayout,
  );

  return (
    <div className="flex flex-col gap-2">
      <QuickFilterPanel />
      <div className="border-t border-border">
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
    </div>
  );
}

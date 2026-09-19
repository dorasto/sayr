import { FilterBuilderContent } from "../filter/filter-builder";
import { QuickFilterPanel } from "../quick-filters/quick-filter-panel";

/**
 * QuickFilterPanel leads the panel, followed by the full filter builder.
 * View listing/edit/delete/save-as-new-view all live in ActiveViewSwitcher
 * (the breadcrumb dropdown) now, and pin/unpin lives in
 * active-view-panel-header.tsx's ActiveViewPanelPinButton — this panel has
 * no view-management UI of its own anymore, regardless of the landerLayout
 * preference (that toggle no longer has a second thing to swap the panel
 * to, since there's nothing left to place besides the filter builder).
 * Page-agnostic: takes no props, meant to be handed to a page's own panel
 * via setPanelContent (see the page-component skill) — the panel
 * id/registration itself is the page's concern, not board's.
 */
export function BoardSidePanelContent() {
	return (
		<div className="flex flex-col gap-2">
			<QuickFilterPanel />
			<div className="border-t border-border">
				<FilterBuilderContent />
			</div>
		</div>
	);
}

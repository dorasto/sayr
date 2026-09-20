import { QuickFilterPanel } from "../quick-filters/quick-filter-panel";

/**
 * The right panel's body: the quick filters, and nothing else. The full filter builder lives
 * behind the Filter button in the page toolbar (filter-builder.tsx's FilterBuilder), view
 * listing/edit/delete/save-as-new all live in ActiveViewSwitcher (the breadcrumb dropdown), and
 * pin/unpin lives in active-view-panel-header.tsx's ActiveViewPanelPinButton.
 * Page-agnostic: takes no props, meant to be handed to a page's own panel via setPanelContent
 * (see the page-component skill) — the panel id/registration itself is the page's concern,
 * not board's. Kept as its own component (rather than handing QuickFilterPanel over directly)
 * as the seam for whatever else the panel grows.
 */
export function BoardSidePanelContent() {
	return <QuickFilterPanel />;
}

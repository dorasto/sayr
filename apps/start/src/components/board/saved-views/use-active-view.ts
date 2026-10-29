import { areStatesEqual, getViewCombinedState, useBoardViewState } from "../filter/use-board-view-state";
import { useBoardSavedViews } from "./use-board-saved-views";

/**
 * The saved view (from the board's `useBoardSavedViews()` source) the URL currently points at (undefined on "All tasks"), plus whether the
 * board's live filters/view config have drifted from it. One place for the lookup and the dirty
 * predicate so the breadcrumb switcher, the panel header, and the Cmd+K commands can't disagree.
 */
export function useActiveView() {
	const { views } = useBoardSavedViews();
	const { viewSlug, filters, viewConfig, supportsSavedViews, baseState } = useBoardViewState();

	// Scopes without saved views (public/memory/controlled): no active view, never dirty.
	if (!supportsSavedViews) {
		return { activeView: undefined, isDirtyFromActiveView: false, isDirty: false };
	}

	const activeView = views.find((view) => (view.slug || view.id) === viewSlug);
	const current = { filters, viewConfig };
	const isDirtyFromActiveView = !!activeView && !areStatesEqual(current, getViewCombinedState(activeView));
	// No view selected, but the live state already differs from what this scope starts from (its
	// `initial`, else the shared default — what "clear view" returns to) — "dirty" here means "worth
	// offering to save", not "differs from a view".
	const isDirtyFromBlank = !activeView && !areStatesEqual(current, baseState);

	return { activeView, isDirtyFromActiveView, isDirty: isDirtyFromActiveView || isDirtyFromBlank };
}

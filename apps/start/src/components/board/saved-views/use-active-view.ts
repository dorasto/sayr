import {
	areStatesEqual,
	DEFAULT_COMBINED_STATE,
	getViewCombinedState,
	useBoardViewState,
} from "../filter/use-board-view-state";
import { usePersonalViews } from "./use-personal-views";

/**
 * The personal view the URL currently points at (undefined on "All tasks"), plus whether the
 * board's live filters/view config have drifted from it. One place for the lookup and the dirty
 * predicate so the breadcrumb switcher, the panel header, and the Cmd+K commands can't disagree.
 */
export function useActiveView() {
	const { personalViews } = usePersonalViews();
	const { viewSlug, filters, viewConfig } = useBoardViewState();

	const activeView = personalViews.find((view) => (view.slug || view.id) === viewSlug);
	const current = { filters, viewConfig };
	const isDirtyFromActiveView = !!activeView && !areStatesEqual(current, getViewCombinedState(activeView));
	// No view selected, but the live state already differs from the blank default — "dirty" here
	// means "worth offering to save", not "differs from a view".
	const isDirtyFromBlank = !activeView && !areStatesEqual(current, DEFAULT_COMBINED_STATE);

	return { activeView, isDirtyFromActiveView, isDirty: isDirtyFromActiveView || isDirtyFromBlank };
}

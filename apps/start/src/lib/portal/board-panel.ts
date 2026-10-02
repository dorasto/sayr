/**
 * Pure decisions behind the board's single right-hand panel: it shows the overview (composer, categories, latest
 * release) by default and swaps to a post (Peek) while one is selected, with the selection mirrored in `?task=`.
 * Kept free of React and the sidebar store so the rules can be unit-tested.
 */

/**
 * What the panel is currently showing, as far as the provider that drives it knows: `undefined` before anything was
 * applied (a fresh mount), `null` for the overview, or the short id of the post shown.
 */
export type AppliedPanelView = number | null | undefined;

export type UrlSyncAction =
	/** The panel already shows what the URL asks for. */
	| "none"
	/** Put the overview into the panel (no `?task`, or the post was closed). */
	| "show-rail"
	/** Put the post from `?task` into the panel and open it (desktop). */
	| "show-post"
	/** A `?task` deep link below the desktop width: send the visitor to the full post page instead. */
	| "redirect-to-post"
	/** The window was narrowed while a post was selected: drop the selection and return to the overview. */
	| "clear-post";

/**
 * How the panel should react to the `?task` param (or the viewport) changing. Only called once the panel is
 * registered with `Page`.
 */
export function getUrlSyncAction({
	desktop,
	urlShortId,
	applied,
}: {
	desktop: boolean;
	urlShortId: number | null;
	applied: AppliedPanelView;
}): UrlSyncAction {
	if (urlShortId === null) return applied === null ? "none" : "show-rail";
	if (!desktop) return applied === urlShortId ? "clear-post" : "redirect-to-post";
	return applied === urlShortId ? "none" : "show-post";
}

export type RowClickAction =
	/** Leave the click to the link: it navigates to the full post. */
	| "follow-link"
	/** Show this post in the panel. */
	| "select"
	/** The row is already the selected post: go back to the overview. */
	| "deselect";

/**
 * What a click on a board row does. Narrow viewports, modified clicks (new tab etc.) and rows without a usable
 * short id follow the link; otherwise the row selects its post, and clicking the selected row again deselects it.
 */
export function getRowClickAction({
	desktop,
	intercept,
	rowShortId,
	selectedShortId,
}: {
	desktop: boolean;
	/** `shouldInterceptRowClick(event)`: a plain primary-button click. */
	intercept: boolean;
	rowShortId: number | null;
	selectedShortId: number | null;
}): RowClickAction {
	if (!desktop || !intercept || rowShortId === null) return "follow-link";
	return rowShortId === selectedShortId ? "deselect" : "select";
}

// Which primary-sidebar row is highlighted — exactly one at a time. A page can match several rows (a pinned org
// view sits in Favourites and in its org's section; any view also matches its page's Dashboard / All tasks row),
// so the rows don't each decide for themselves: the sidebar resolves one id here and each row compares its own.

/** A sidebar row and the page it opens. */
export interface SidebarTarget {
	id: string;
	pathname: string;
	/** The `?view=` the row opens. Absent = the row matches its page whatever view is showing. */
	view?: string;
	/** Also matches pages below `pathname` (e.g. a release under Releases). */
	prefix?: boolean;
}

export interface SidebarLocation {
	pathname: string;
	view?: string;
}

function matches(target: SidebarTarget, location: SidebarLocation): boolean {
	const onPage = target.prefix
		? location.pathname === target.pathname || location.pathname.startsWith(`${target.pathname}/`)
		: location.pathname === target.pathname;
	return onPage && (target.view === undefined || target.view === location.view);
}

/**
 * The one row to highlight for `location`:
 * 1. the row last clicked, while the page still matches it (so a Favourites click lights that row, not its twin);
 * 2. else the most specific matching row — one opening this exact view beats its page's row — first in `targets`
 *    order on a tie (callers list org sections before Favourites);
 * 3. else nothing.
 * The click only ever picks between matching rows, so a view changed any other way (the board's view switcher,
 * Cmd+K, back/forward) falls through to rule 2 and the highlight follows the page.
 */
export function resolveActiveSidebarItem(
	targets: readonly SidebarTarget[],
	location: SidebarLocation,
	lastClickedId?: string | null
): string | undefined {
	const matching = targets.filter((target) => matches(target, location));
	if (lastClickedId && matching.some((target) => target.id === lastClickedId)) return lastClickedId;
	return (matching.find((target) => target.view !== undefined) ?? matching[0])?.id;
}

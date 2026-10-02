import { type ReactNode, useMemo } from "react";
import { BoardRailContext, type BoardRailContextValue } from "./board-rail-context";

interface BoardRailProviderProps extends BoardRailContextValue {
	children: ReactNode;
}

/**
 * Wrap the board's `<Page>` in this. The panel's overview content is a module-level constant that reads the board's
 * data from here.
 */
export function BoardRailProvider({
	releases,
	counts,
	activeCategorySlug,
	onCategoryChange,
	children,
}: BoardRailProviderProps) {
	const rail = useMemo<BoardRailContextValue>(
		() => ({ releases, counts, activeCategorySlug, onCategoryChange }),
		[releases, counts, activeCategorySlug, onCategoryChange]
	);

	return <BoardRailContext.Provider value={rail}>{children}</BoardRailContext.Provider>;
}

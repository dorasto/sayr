import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { BoardCounts, PublicReleaseSummary } from "./useBoardSideData";

/** Everything the board panel's overview needs from the page, so its content can be a prop-less constant. */
interface BoardRailContextValue {
	releases: ReadonlyArray<PublicReleaseSummary>;
	counts: BoardCounts | undefined;
	/** Slug of the category filtering the board, if any. */
	activeCategorySlug: string | null;
	onCategoryChange: (slug: string | null) => void;
}

const BoardRailContext = createContext<BoardRailContextValue | undefined>(undefined);

/** The board's data for the overview panel; throws outside `BoardRailProvider`. */
export function useBoardRail() {
	const context = useContext(BoardRailContext);
	if (context === undefined) {
		throw new Error("useBoardRail must be used within a BoardRailProvider");
	}
	return context;
}

interface BoardRailProviderProps extends BoardRailContextValue {
	children: ReactNode;
}

/**
 * Wrap the board's `<Page>` in this. The panel's overview content (`RAIL_CONTENT`) is a module-level constant that
 * reads the board's data from here.
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

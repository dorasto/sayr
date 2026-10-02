import { createContext, useContext } from "react";
import type { BoardCounts, PublicReleaseSummary } from "./useBoardSideData";

/** Everything the board panel's overview needs from the page, so its content can be a prop-less constant. */
export interface BoardRailContextValue {
	releases: ReadonlyArray<PublicReleaseSummary>;
	counts: BoardCounts | undefined;
	/** Slug of the category filtering the board, if any. */
	activeCategorySlug: string | null;
	onCategoryChange: (slug: string | null) => void;
}

export const BoardRailContext = createContext<BoardRailContextValue | undefined>(undefined);

export function useBoardRail(): BoardRailContextValue {
	const context = useContext(BoardRailContext);
	if (context === undefined) {
		throw new Error("useBoardRail must be used within a BoardRailProvider");
	}
	return context;
}

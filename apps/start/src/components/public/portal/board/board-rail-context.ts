import type { schema } from "@repo/database";
import { createContext, useContext } from "react";
import type { BoardCounts, PublicReleaseSummary } from "./useBoardSideData";

/** Everything the board panel's overview needs from the page, so its content can be a prop-less constant. */
export interface BoardRailContextValue {
	/** Every loaded board post, searched for look-alikes while the composer's title is typed. */
	loadedTasks: ReadonlyArray<schema.TaskWithLabels>;
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

/** The composer's unsent input. Lives in the provider (not the panel) so it survives the panel swapping views or closing. */
export interface ComposerDraft {
	expanded: boolean;
	title: string;
	description: string;
	categoryId: string | null;
}

export const EMPTY_COMPOSER_DRAFT: ComposerDraft = { expanded: false, title: "", description: "", categoryId: null };

export interface ComposerDraftContextValue {
	draft: ComposerDraft;
	updateDraft: (patch: Partial<ComposerDraft>) => void;
	resetDraft: () => void;
}

export const ComposerDraftContext = createContext<ComposerDraftContextValue | undefined>(undefined);

export function useComposerDraft(): ComposerDraftContextValue {
	const context = useContext(ComposerDraftContext);
	if (context === undefined) {
		throw new Error("useComposerDraft must be used within a BoardRailProvider");
	}
	return context;
}

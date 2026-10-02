import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
	BoardRailContext,
	type BoardRailContextValue,
	type ComposerDraft,
	ComposerDraftContext,
	type ComposerDraftContextValue,
	EMPTY_COMPOSER_DRAFT,
} from "./board-rail-context";

interface BoardRailProviderProps extends BoardRailContextValue {
	children: ReactNode;
}

/**
 * Wrap the board's `<Page>` in this. The panel's overview content is a module-level constant that reads the board's
 * data from here, and the composer keeps its draft here: panel content unmounts when the panel swaps to a post or is
 * closed, and the draft must outlive that.
 */
export function BoardRailProvider({
	loadedTasks,
	releases,
	counts,
	activeCategorySlug,
	onCategoryChange,
	children,
}: BoardRailProviderProps) {
	const [draft, setDraft] = useState<ComposerDraft>(EMPTY_COMPOSER_DRAFT);
	const updateDraft = useCallback((patch: Partial<ComposerDraft>) => setDraft((prev) => ({ ...prev, ...patch })), []);
	const resetDraft = useCallback(() => setDraft(EMPTY_COMPOSER_DRAFT), []);

	const rail = useMemo<BoardRailContextValue>(
		() => ({ loadedTasks, releases, counts, activeCategorySlug, onCategoryChange }),
		[loadedTasks, releases, counts, activeCategorySlug, onCategoryChange]
	);
	const composer = useMemo<ComposerDraftContextValue>(
		() => ({ draft, updateDraft, resetDraft }),
		[draft, updateDraft, resetDraft]
	);

	return (
		<BoardRailContext.Provider value={rail}>
			<ComposerDraftContext.Provider value={composer}>{children}</ComposerDraftContext.Provider>
		</BoardRailContext.Provider>
	);
}

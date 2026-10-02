import type { schema } from "@repo/database";
import { createContext, useContext } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePeek } from "../peek/peek-context";
import type { PublicReleaseSummary } from "./useBoardSideData";

/**
 * What the board's post renderer (`PublicBoardRow`) needs that the admin board's renderer slots
 * don't carry: the board's renderers only receive `{ task }`, and the public releases are summaries, not the
 * `releaseType` rows a `BoardDataSource` holds.
 */
export interface PublicPostsContextValue {
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
}

export const PublicPostsContext = createContext<PublicPostsContextValue | undefined>(undefined);

/** The props `PublicTaskItem` takes, resolved for one post from the page's contexts (Peek, org layout, releases). */
export function usePublicPostProps(task: Pick<schema.TaskWithLabels, "shortId" | "releaseId">) {
	const context = useContext(PublicPostsContext);
	if (context === undefined) {
		throw new Error("usePublicPostProps must be used within PublicPostsContext");
	}
	const { categories } = usePublicOrganizationLayout();
	// Rows look the same whether or not a post is open in the board panel; only the open one is marked. Clicks are
	// handed to the panel's provider (`openPost`), which shows the post on desktop and otherwise lets the link
	// navigate to the full post.
	const { openPost, shortId: selectedShortId } = usePeek();

	return {
		categories,
		release: task.releaseId ? (context.releasesById.get(task.releaseId) ?? null) : null,
		selected: selectedShortId !== null && selectedShortId === task.shortId,
		onOpen: openPost,
	};
}

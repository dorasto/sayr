import type { schema } from "@repo/database";
import { createContext, type MouseEvent, useContext } from "react";
import type { PeekPost } from "@/lib/portal/peek";
import type { PeekPostStatus } from "./usePeekPost";

export interface PeekContextValue {
	/** Board row `onOpen`: opens Peek (desktop, plain left click), otherwise leaves the click to the link. */
	openPost: (task: Pick<schema.TaskWithLabels, "shortId">, event: MouseEvent<HTMLAnchorElement>) => void;
	/** Leaves the post view: clears `?task` and puts the panel's overview back (the panel itself stays open). */
	closePost: () => void;
	/** Short id of the post the panel is showing, or `null` while it shows the overview (or is closed). */
	shortId: number | null;
	/** The live post for `shortId` (the board's cached copy when loaded, else fetched). */
	post: PeekPost | null;
	status: PeekPostStatus;
	/** Every loaded board post, for `#task` mentions in the description and the comment box. */
	tasks: schema.TaskWithLabels[];
}

export const PeekContext = createContext<PeekContextValue | undefined>(undefined);

export function usePeek(): PeekContextValue {
	const context = useContext(PeekContext);
	if (context === undefined) {
		throw new Error("usePeek must be used within a PeekProvider");
	}
	return context;
}

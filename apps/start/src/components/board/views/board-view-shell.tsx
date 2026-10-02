import type { schema } from "@repo/database";
import { BoardViewCapabilityScope } from "../core/board-data";
import { useActiveBoardView } from "./view-registry";

interface BoardViewShellProps {
	tasks: readonly schema.TaskWithLabels[];
}

/**
 * Dispatches already filtered/sorted board tasks to the selected presentation: a lookup in the view
 * registry (an id the page doesn't register falls back to "list"). The active view's own limits
 * (e.g. a card grid can't drag) narrow the capabilities of everything rendered inside it.
 */
export function BoardViewShell({ tasks }: BoardViewShellProps) {
	const view = useActiveBoardView();
	const ViewComponent = view.component;

	return (
		<BoardViewCapabilityScope view={view}>
			<ViewComponent items={tasks} />
		</BoardViewCapabilityScope>
	);
}

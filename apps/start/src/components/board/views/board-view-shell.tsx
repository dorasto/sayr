import { BoardViewCapabilityScope } from "../core/board-data";
import type { BoardItem } from "../core/board-item";
import { useActiveBoardView } from "./view-registry";

interface BoardViewShellProps {
	items: readonly BoardItem[];
}

/**
 * Dispatches already filtered/sorted board items to the selected presentation: a lookup in the view
 * registry (an id the page doesn't register falls back to "list"). The active view's own limits
 * (e.g. a card grid can't drag) narrow the capabilities of everything rendered inside it.
 */
export function BoardViewShell({ items }: BoardViewShellProps) {
	const view = useActiveBoardView();
	const ViewComponent = view.component;

	return (
		<BoardViewCapabilityScope view={view}>
			<ViewComponent items={items} />
		</BoardViewCapabilityScope>
	);
}

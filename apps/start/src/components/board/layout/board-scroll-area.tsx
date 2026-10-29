import { cn } from "@repo/ui/lib/utils";
import { Board } from "../board";
import { useActiveBoardView } from "../views/view-registry";

/**
 * A full-page board's scroll container (/home, an org's tasks page). A full-bleed view (kanban) brings its
 * own edge-to-edge chrome, so the container drops its padding for it; the active view comes from the
 * registry, not a view-id check. Must render inside the board's provider (the registry lives there).
 */
export function BoardScrollArea() {
	const { fullBleed } = useActiveBoardView();
	return (
		<div className={cn("flex-1 min-h-0 overflow-auto px-2 pb-4 w-full", fullBleed && "p-0 pl-2 rounded-xl")}>
			<Board />
		</div>
	);
}

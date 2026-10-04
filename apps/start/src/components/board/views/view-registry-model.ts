import type { ComponentType, ReactNode } from "react";
import type { BoardItem, TaskItem } from "../core/board-item";
import { resolveViewMode } from "../core/view-config";

// The view-registry contract plus the PURE rules built on it. A `.ts` file with type-only imports from
// React (no JSX), so vitest can exercise it directly — views/view-registry.tsx layers the icons and the
// built-in definitions on top.

/** What a view can and can't do; the board hides the controls (and capabilities) a view doesn't support. */
export interface BoardViewSupports {
	/** Group-by is meaningful (a card grid / list / kanban column set follows it). */
	grouping: boolean;
	/** A second grouping level (list sections-in-sections, kanban rows) is meaningful. */
	subGrouping: boolean;
	/** Drag-to-regroup works. ANDed into the board's `canDrag` capability. */
	drag: boolean;
	/** Sort-by is meaningful. */
	sort: boolean;
	/** "nested" = subtasks render under their parent; "flat" = every task is its own entry. */
	subtasks: "nested" | "flat";
}

export interface BoardViewDefinition<T extends BoardItem = TaskItem> {
	/** The persisted view-mode id for the built-ins; a page-local view uses its own (never persisted) id. */
	id: "list" | "kanban" | "card" | (string & {});
	label: string;
	/** The icon in the view picker. */
	icon: ReactNode;
	/** Receives the already filtered/sorted items; everything else comes from the board contexts. */
	component: ComponentType<{ items: readonly T[] }>;
	supports: BoardViewSupports;
	/**
	 * The host should not pad the scroll container around this view (it brings its own edge-to-edge
	 * chrome, e.g. kanban columns).
	 */
	fullBleed?: boolean;
}

/**
 * The view to render for a requested id. An id the registry doesn't have falls back to "list" (else the
 * first registered view), so a stale saved view, a hand-edited URL or a mode the page doesn't offer
 * never blanks the board. Throws only on an empty registry, which is a programming error.
 */
export function getBoardView<T extends BoardItem = TaskItem>(
	id: string | undefined,
	views: readonly BoardViewDefinition<T>[]
): BoardViewDefinition<T> {
	const resolvedId = resolveViewMode(
		id,
		views.map((view) => view.id)
	);
	const view = views.find((candidate) => candidate.id === resolvedId) ?? views[0];
	if (!view) throw new Error("The board has no registered views");
	return view;
}

export interface BoardViewOptionVisibility {
	/** More than one view is registered, so a picker is worth showing. */
	showViewPicker: boolean;
	showGrouping: boolean;
	showSubGrouping: boolean;
	showSort: boolean;
}

/** Which controls in the view-options popover apply to `activeView`. */
export function getViewOptionVisibility(
	views: readonly { supports: BoardViewSupports }[],
	activeView: { supports: BoardViewSupports }
): BoardViewOptionVisibility {
	return {
		showViewPicker: views.length > 1,
		showGrouping: activeView.supports.grouping,
		showSubGrouping: activeView.supports.grouping && activeView.supports.subGrouping,
		showSort: activeView.supports.sort,
	};
}

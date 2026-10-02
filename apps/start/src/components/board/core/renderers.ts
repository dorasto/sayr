import type { ComponentType, ReactNode } from "react";
import type { TaskItem } from "./board-item";

// Presentation slots a page can hand to the board (via `BoardProvider`'s `renderers` prop) to swap what
// the views render per item, without forking the views. Every slot is optional; an absent slot means
// today's admin rendering (BoardRow / BoardCard / BoardLoadMore). Types + one pure helper only (no JSX,
// no `@/` imports) so vitest can exercise it directly.

/** Props the list view passes to a row renderer. */
export interface BoardRowRendererProps<T = TaskItem> {
	task: T;
	/** Rendered as a subtask under its parent's row. A custom row is free to ignore it (render flat). */
	nested?: boolean;
}

/** Props the kanban and card views pass to a card renderer. */
export interface BoardCardRendererProps<T = TaskItem> {
	task: T;
	/** Which view it sits in: a kanban cell or the card-view grid. */
	variant?: "kanban" | "grid";
}

export type BoardRowRenderer<T = TaskItem> = ComponentType<BoardRowRendererProps<T>>;
export type BoardCardRenderer<T = TaskItem> = ComponentType<BoardCardRendererProps<T>>;

export interface BoardRenderers<T = TaskItem> {
	/** One list row (top-level and nested subtasks). Absent = BoardRow. */
	row?: BoardRowRenderer<T>;
	/** One kanban card / card-view card. Absent = BoardCard. */
	card?: BoardCardRenderer<T>;
	/** Wraps the rows of each list section (e.g. a bordered shell). Absent = rows render bare. */
	listContainer?: ComponentType<{ children: ReactNode }>;
	/** Rendered under the views while the data source has another page. Absent = BoardLoadMore. */
	footer?: ComponentType;
	/** Shown instead of the views while the data source loads / failed / has nothing to show. */
	states?: BoardRenderStates;
}

export interface BoardRenderStates {
	loading?: ReactNode;
	error?: ReactNode;
	empty?: ReactNode;
}

export type BoardStateKind = "loading" | "error" | "empty";

/**
 * Which board-level state (if any) replaces the views. Loading and error only apply while there is
 * nothing to show (a refetch/failed page over existing items keeps the items); empty applies once
 * neither of those does. A data source without `status` (the admin one) is never loading/errored.
 */
export function getBoardStateKind(
	status: { isLoading: boolean; isError: boolean } | undefined,
	itemCount: number
): BoardStateKind | null {
	if (itemCount > 0) return null;
	if (status?.isLoading) return "loading";
	if (status?.isError) return "error";
	return "empty";
}

/**
 * What `Board` renders in place of the views, or `undefined` to render the views as usual. A loading
 * source with no `loading` slot renders nothing (`null`); error/empty with no slot fall through to the
 * views (an empty list still shows its own empty groups / message).
 */
export function resolveBoardState(
	status: { isLoading: boolean; isError: boolean } | undefined,
	itemCount: number,
	states: BoardRenderStates | undefined
): ReactNode | undefined {
	const kind = getBoardStateKind(status, itemCount);
	if (kind === null) return undefined;
	if (kind === "loading") return states?.loading ?? null;
	return states?.[kind];
}

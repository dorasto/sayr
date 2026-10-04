/**
 * What a board instance lets the viewer do. Pure data + one pure resolver, so it
 * can be unit-tested without React (and has no `@/` imports on purpose: apps/start's
 * vitest config has no alias).
 */
export interface BoardCapabilities {
	/** Drag-to-regroup (list + kanban). */
	canDrag: boolean;
	/** Inline field pickers (status, priority, assignee, ...). */
	canEditFields: boolean;
	/** Row/card selection checkboxes. */
	canSelect: boolean;
	/** Right-click task menu. */
	canContextMenu: boolean;
	/** The bulk-action bar for selected items. */
	canBulk: boolean;
	/** Saved-view chrome (switcher, save, reset). */
	canSavedViews: boolean;
}

/** The signed-in admin board (/home): everything on. */
export const ADMIN_CAPABILITIES: BoardCapabilities = {
	canDrag: true,
	canEditFields: true,
	canSelect: true,
	canContextMenu: true,
	canBulk: true,
	canSavedViews: true,
};

/** A read-only board (public portal): everything off. */
export const READ_ONLY_CAPABILITIES: BoardCapabilities = {
	canDrag: false,
	canEditFields: false,
	canSelect: false,
	canContextMenu: false,
	canBulk: false,
	canSavedViews: false,
};

/** The slice of a view definition that can narrow what the board allows. */
export interface BoardViewCapabilityHints {
	supports?: { drag?: boolean };
}

/**
 * Layers `overrides` over `base`, then ANDs in the active view's own limits — a view
 * that can't drag (e.g. a card grid) turns `canDrag` off even when the board allows it.
 * A view can only ever narrow a capability, never grant one.
 */
export function resolveCapabilities(
	base: BoardCapabilities,
	overrides?: Partial<BoardCapabilities>,
	view?: BoardViewCapabilityHints
): BoardCapabilities {
	const merged: BoardCapabilities = { ...base, ...overrides };
	return { ...merged, canDrag: merged.canDrag && (view?.supports?.drag ?? true) };
}

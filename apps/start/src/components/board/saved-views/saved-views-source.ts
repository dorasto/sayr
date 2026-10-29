import type { schema } from "@repo/database";
import type { ReactNode } from "react";
import type { FilterState } from "../filter/types";

// Where a board's saved views come from and how they're changed. The board's saved-view UI
// (switcher, panel header, save/edit popovers, the Cmd+K view commands) reads this through
// `useBoardSavedViews()` instead of the personal store directly, so a board can be handed a
// different set — an org's saved views — without forking that UI. /home passes none and gets
// the personal source (saved-views/use-board-saved-views.ts).

export type SavedViewConfig = schema.savedViewType["viewConfig"];

export interface SavedViewCreateInput {
	name: string;
	filterParams: string;
	viewConfig?: SavedViewConfig;
}

/** `slug` is what `?view=` addresses the view by; both sources persist it (a view without one is addressed by its id). */
export type SavedViewUpdates = Partial<{
	name: string;
	slug: string;
	viewConfig: SavedViewConfig;
	filterParams: string;
}>;

export interface SavedViewsSource {
	/** Personal views (user-scoped, `organizationId: null`) or one org's shared views. */
	kind: "personal" | "org";
	views: readonly schema.savedViewType[];
	create: (input: SavedViewCreateInput) => Promise<unknown>;
	update: (viewId: string, updates: SavedViewUpdates) => Promise<unknown>;
	remove: (viewId: string) => Promise<unknown>;
	/** Pin/unpin (the Favourites sidebar). Absent = the source has no pinning; the pin button hides. */
	togglePin?: (viewId: string) => Promise<unknown>;
	/** Whether the viewer may save another view (e.g. a plan limit or a missing permission). Absent = true. */
	canCreate?: boolean;
	/** Shown instead of the save action when `canCreate` is false. */
	limitMessage?: string;
}

/**
 * A fixed filter shortcut offered in the view switcher next to the saved views (e.g. an org page's
 * "Mine" / "Unassigned"). Not a saved view: nothing is persisted, and it is "active" whenever the
 * board's live filters equal `filters`.
 */
export interface BoardViewPreset {
	id: string;
	label: string;
	icon: ReactNode;
	filters: FilterState;
}

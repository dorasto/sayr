import type { schema } from "@repo/database";
import { Store } from "@tanstack/react-store";
import {
	createPersonalViewAction,
	deletePersonalViewAction,
	getPersonalViewsAction,
	reorderPersonalViewsAction,
	updatePersonalViewAction,
} from "@/lib/serverFunctions/personalViews";
import { favouritesActions } from "./favourites-store";

export interface PersonalViewsStoreState {
	views: schema.savedViewType[];
	loaded: boolean;
}

/**
 * Matches getPersonalViews' own DB ordering (by position). Pinning isn't part of a view any more: the sidebar's
 * Favourites are their own store (favourites-store.ts, SAY-104).
 */
function sortViews(views: schema.savedViewType[]): schema.savedViewType[] {
	return [...views].sort((a, b) => a.position - b.position);
}

/** What `updateView` may change — `updatePersonalViewAction` persists each of these (incl. `slug`). */
export type PersonalViewUpdates = Partial<{
	name: string;
	slug: string;
	viewConfig: schema.savedViewType["viewConfig"];
	filterParams: string;
}>;

export const personalViewsStore = new Store<PersonalViewsStoreState>({
	views: [],
	loaded: false,
});

export const personalViewsActions = {
	/** Seed from SSR loader data (e.g. /home's route loader) — zero-flash, no extra fetch. */
	hydrate: (views: schema.savedViewType[]) => {
		personalViewsStore.setState(() => ({ views: sortViews(views), loaded: true }));
	},

	/** Fetch from the server — used once from RootProvider so every page has the list. */
	refresh: async () => {
		try {
			const views = await getPersonalViewsAction();
			personalViewsStore.setState(() => ({ views: sortViews(views), loaded: true }));
		} catch {
			// Non-critical
		}
	},

	create: async (input: { name: string; filterParams: string; viewConfig?: schema.savedViewType["viewConfig"] }) => {
		const created = await createPersonalViewAction({ data: input });
		personalViewsStore.setState((state) => ({ ...state, views: sortViews([...state.views, created]) }));
		return created;
	},

	/** Rename and/or edit slug, viewConfig (icon/color/grouping/…) and/or filterParams in one optimistic call. */
	updateView: async (viewId: string, updates: PersonalViewUpdates) => {
		const previous = personalViewsStore.state.views;
		personalViewsStore.setState((state) => ({
			...state,
			views: sortViews(state.views.map((view) => (view.id === viewId ? { ...view, ...updates } : view))),
		}));
		favouritesActions.patchView(viewId, updates);
		try {
			await updatePersonalViewAction({ data: { viewId, updates } });
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			const view = previous.find((v) => v.id === viewId);
			if (view) favouritesActions.patchView(viewId, view);
			throw error;
		}
	},

	remove: async (viewId: string) => {
		const previous = personalViewsStore.state.views;
		personalViewsStore.setState((state) => ({ ...state, views: state.views.filter((view) => view.id !== viewId) }));
		try {
			await deletePersonalViewAction({ data: { viewId } });
			favouritesActions.dropView(viewId);
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			throw error;
		}
	},

	/** Partial-list-safe reorder: rewrites `position` only for the ids given, then re-sorts the full array. */
	reorder: async (orderedIds: string[]) => {
		const previous = personalViewsStore.state.views;
		const positionById = new Map(orderedIds.map((id, index) => [id, index]));
		personalViewsStore.setState((state) => ({
			...state,
			views: sortViews(
				state.views.map((view) => {
					const position = positionById.get(view.id);
					return position === undefined ? view : { ...view, position };
				})
			),
		}));
		try {
			await reorderPersonalViewsAction({ data: { orderedIds } });
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			throw error;
		}
	},
};

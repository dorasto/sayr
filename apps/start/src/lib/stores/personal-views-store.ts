import type { schema } from "@repo/database";
import { Store } from "@tanstack/react-store";
import {
	createPersonalViewAction,
	deletePersonalViewAction,
	getPersonalViewsAction,
	reorderPersonalViewsAction,
	togglePersonalViewPinAction,
	updatePersonalViewAction,
} from "@/lib/serverFunctions/personalViews";

export interface PersonalViewsStoreState {
	views: schema.savedViewType[];
	loaded: boolean;
}

/** Matches getPersonalViews' own DB ordering (pinned first, then by position). */
function sortViews(views: schema.savedViewType[]): schema.savedViewType[] {
	return [...views].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
		return a.position - b.position;
	});
}

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

	/** Rename and/or edit viewConfig (icon/color) and/or filterParams in one optimistic call. */
	updateView: async (
		viewId: string,
		updates: Partial<{ name: string; viewConfig: schema.savedViewType["viewConfig"]; filterParams: string }>
	) => {
		const previous = personalViewsStore.state.views;
		personalViewsStore.setState((state) => ({
			...state,
			views: sortViews(state.views.map((view) => (view.id === viewId ? { ...view, ...updates } : view))),
		}));
		try {
			await updatePersonalViewAction({ data: { viewId, updates } });
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			throw error;
		}
	},

	remove: async (viewId: string) => {
		const previous = personalViewsStore.state.views;
		personalViewsStore.setState((state) => ({ ...state, views: state.views.filter((view) => view.id !== viewId) }));
		try {
			await deletePersonalViewAction({ data: { viewId } });
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			throw error;
		}
	},

	togglePin: async (viewId: string) => {
		const previous = personalViewsStore.state.views;
		const view = previous.find((v) => v.id === viewId);
		if (!view) return;
		const nextPinned = !view.pinned;
		personalViewsStore.setState((state) => ({
			...state,
			views: sortViews(state.views.map((v) => (v.id === viewId ? { ...v, pinned: nextPinned } : v))),
		}));
		try {
			await togglePersonalViewPinAction({ data: { viewId, pinned: nextPinned } });
		} catch (error) {
			personalViewsStore.setState((state) => ({ ...state, views: previous }));
			throw error;
		}
	},

	/**
	 * Partial-list-safe reorder: rewrites `position` only for the ids given (e.g. just the
	 * pinned subset from the Favourites sidebar), leaving every other view's position alone,
	 * then re-sorts the full array. Positions only need to be monotonic within their own
	 * pinned/unpinned bucket, since getPersonalViews orders by pinned first.
	 */
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

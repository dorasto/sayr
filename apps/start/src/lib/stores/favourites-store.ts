import type { FavouriteOrganization, FavouriteWithTarget, schema } from "@repo/database";
import { Store } from "@tanstack/react-store";
import {
	addSavedViewFavouriteAction,
	getFavouritesAction,
	removeSavedViewFavouriteAction,
	reorderFavouritesAction,
} from "@/lib/serverFunctions/favourites";

export type { FavouriteOrganization, FavouriteWithTarget };

export interface FavouritesStoreState {
	/** In the user's own order (the server's `position` order). */
	favourites: FavouriteWithTarget[];
	loaded: boolean;
}

/**
 * The sidebar's Favourites (SAY-104): the user's pinned saved views — personal and org views in one list, in one
 * order. Loaded once from RootProvider. Each entry carries a snapshot of its view, which the view's own writers
 * keep current (`patchView` / `dropView` from the personal-views store, `syncOrgViews` from the org views source
 * and the org's UPDATE_VIEWS events).
 */
export const favouritesStore = new Store<FavouritesStoreState>({ favourites: [], loaded: false });

/** Whether the saved view is in the user's favourites. */
export function isViewFavourite(state: FavouritesStoreState, viewId: string): boolean {
	return state.favourites.some((favourite) => favourite.view.id === viewId);
}

function setFavourites(favourites: FavouriteWithTarget[]) {
	favouritesStore.setState((state) => ({ ...state, favourites }));
}

export const favouritesActions = {
	refresh: async () => {
		try {
			const favourites = await getFavouritesAction();
			favouritesStore.setState(() => ({ favourites, loaded: true }));
		} catch {
			// Non-critical
		}
	},

	/**
	 * Pins or unpins a saved view. Pinning appends it at once (the server then answers with the real list);
	 * either way the list rolls back if saving fails. `organization` is the view's org (null for a personal view).
	 */
	toggleView: async (view: schema.savedViewType, organization: FavouriteOrganization | null) => {
		const previous = favouritesStore.state.favourites;
		if (previous.some((favourite) => favourite.view.id === view.id)) {
			setFavourites(previous.filter((favourite) => favourite.view.id !== view.id));
			try {
				await removeSavedViewFavouriteAction({ data: { savedViewId: view.id } });
			} catch (error) {
				setFavourites(previous);
				throw error;
			}
			return;
		}
		const position = (previous.at(-1)?.position ?? -1) + 1;
		setFavourites([...previous, { id: `pending:${view.id}`, position, view, organization }]);
		try {
			setFavourites(await addSavedViewFavouriteAction({ data: { savedViewId: view.id } }));
		} catch (error) {
			setFavourites(previous);
			throw error;
		}
	},

	/** Saves a new order (favourite ids, e.g. from the sidebar's drag). */
	reorder: async (orderedIds: string[]) => {
		const previous = favouritesStore.state.favourites;
		const byId = new Map(previous.map((favourite) => [favourite.id, favourite]));
		setFavourites(
			orderedIds.flatMap((id, position) => {
				const favourite = byId.get(id);
				return favourite ? [{ ...favourite, position }] : [];
			})
		);
		try {
			await reorderFavouritesAction({ data: { orderedIds: orderedIds.filter((id) => !id.startsWith("pending:")) } });
		} catch (error) {
			setFavourites(previous);
			throw error;
		}
	},

	/** A favourited view was edited (renamed, new icon/slug…). */
	patchView: (viewId: string, updates: Partial<schema.savedViewType>) => {
		const { favourites } = favouritesStore.state;
		if (!favourites.some((favourite) => favourite.view.id === viewId)) return;
		setFavourites(
			favourites.map((favourite) =>
				favourite.view.id === viewId ? { ...favourite, view: { ...favourite.view, ...updates } } : favourite
			)
		);
	},

	/** A view was deleted: the database already dropped its favourites (cascade), so just mirror that. */
	dropView: (viewId: string) => {
		const { favourites } = favouritesStore.state;
		if (!favourites.some((favourite) => favourite.view.id === viewId)) return;
		setFavourites(favourites.filter((favourite) => favourite.view.id !== viewId));
	},

	/** An org's full, current view list: refresh its favourited views' snapshots and drop any that are gone. */
	syncOrgViews: (organizationId: string, views: readonly schema.savedViewType[]) => {
		const { favourites } = favouritesStore.state;
		if (!favourites.some((favourite) => favourite.organization?.id === organizationId)) return;
		const byId = new Map(views.map((view) => [view.id, view]));
		setFavourites(
			favourites.flatMap((favourite) => {
				if (favourite.organization?.id !== organizationId) return [favourite];
				const view = byId.get(favourite.view.id);
				return view ? [{ ...favourite, view }] : [];
			})
		);
	},
};

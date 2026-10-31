"use client";

import type { schema } from "@repo/database";
import { useStore } from "@tanstack/react-store";
import { useCallback } from "react";
import { favouritesActions } from "@/lib/stores/favourites-store";
import { type PersonalViewUpdates, personalViewsActions, personalViewsStore } from "@/lib/stores/personal-views-store";

/**
 * Thin adapter over personal-views-store — the store (not ContextLander) is the single
 * source of truth, so the Favourites sidebar (mounted on every admin page) and /home's
 * own UI never risk drifting out of sync.
 */
export function usePersonalViews() {
	const personalViews = useStore(personalViewsStore, (state) => state.views);

	const createView = useCallback(
		(input: { name: string; filterParams: string; viewConfig?: schema.savedViewType["viewConfig"] }) =>
			personalViewsActions.create(input),
		[]
	);

	const updateView = useCallback(
		(viewId: string, updates: PersonalViewUpdates) => personalViewsActions.updateView(viewId, updates),
		[]
	);

	const deleteView = useCallback((viewId: string) => personalViewsActions.remove(viewId), []);

	// Pinning is the Favourites store's (SAY-104); a personal view is favourited with no org.
	const togglePin = useCallback(async (viewId: string) => {
		const view = personalViewsStore.state.views.find((v) => v.id === viewId);
		if (view) await favouritesActions.toggleView(view, null);
	}, []);

	const reorder = useCallback((orderedIds: string[]) => personalViewsActions.reorder(orderedIds), []);

	return { personalViews, createView, updateView, deleteView, togglePin, reorder };
}

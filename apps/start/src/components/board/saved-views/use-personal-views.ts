"use client";

import type { schema } from "@repo/database";
import { useStore } from "@tanstack/react-store";
import { useCallback } from "react";
import { personalViewsActions, personalViewsStore } from "@/lib/stores/personal-views-store";

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
		(
			viewId: string,
			updates: Partial<{ name: string; viewConfig: schema.savedViewType["viewConfig"]; filterParams: string }>
		) => personalViewsActions.updateView(viewId, updates),
		[]
	);

	const deleteView = useCallback((viewId: string) => personalViewsActions.remove(viewId), []);

	const togglePin = useCallback((viewId: string) => personalViewsActions.togglePin(viewId), []);

	const reorder = useCallback((orderedIds: string[]) => personalViewsActions.reorder(orderedIds), []);

	return { personalViews, createView, updateView, deleteView, togglePin, reorder };
}

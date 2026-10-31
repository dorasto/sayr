import { useMemo } from "react";
import { useBoardSavedViewsOverride } from "../core/board-data";
import type { SavedViewsSource } from "./saved-views-source";
import { usePersonalViews } from "./use-personal-views";

/** The signed-in user's personal views (personal-views-store) as a `SavedViewsSource`. */
export function usePersonalSavedViewsSource(): SavedViewsSource {
	const { personalViews, createView, updateView, deleteView, togglePin } = usePersonalViews();
	return useMemo<SavedViewsSource>(
		() => ({
			kind: "personal",
			views: personalViews,
			create: createView,
			update: updateView,
			remove: deleteView,
			togglePin,
		}),
		[personalViews, createView, updateView, deleteView, togglePin]
	);
}

/**
 * The saved views the enclosing board offers: the `savedViews` source its `BoardProvider` was given,
 * else the personal views. Safe outside a `BoardProvider` (e.g. /home's Cmd+K commands, registered
 * above the provider) — it then always returns the personal source.
 */
export function useBoardSavedViews(): SavedViewsSource {
	const override = useBoardSavedViewsOverride();
	const personal = usePersonalSavedViewsSource();
	return override ?? personal;
}

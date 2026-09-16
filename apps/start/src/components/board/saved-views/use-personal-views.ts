"use client";

import type { schema } from "@repo/database";
import { useCallback } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import {
	createPersonalViewAction,
	deletePersonalViewAction,
	reorderPersonalViewsAction,
	togglePersonalViewPinAction,
	updatePersonalViewAction,
} from "@/lib/serverFunctions/personalViews";

/**
 * CRUD over the lander's personalViews list. Optimistic-then-persist,
 * same shape as useBoardTaskFieldAction: update ContextLander's local
 * state immediately, fire the serverFn, roll back on failure. There's no
 * SSE/broadcast for personal views (they're single-user, cross-org —
 * nothing else needs to hear about them), so local state is the only
 * source of truth to keep in sync.
 */
export function usePersonalViews() {
	const { personalViews, setPersonalViews } = useLanderData();

	const createView = useCallback(
		async (input: { name: string; filterParams: string; viewConfig?: schema.savedViewType["viewConfig"] }) => {
			const created = await createPersonalViewAction({ data: input });
			setPersonalViews([...personalViews, created]);
			return created;
		},
		[personalViews, setPersonalViews]
	);

	const renameView = useCallback(
		async (viewId: string, name: string) => {
			const previous = personalViews;
			setPersonalViews(personalViews.map((view) => (view.id === viewId ? { ...view, name } : view)));
			try {
				await updatePersonalViewAction({ data: { viewId, updates: { name } } });
			} catch (error) {
				setPersonalViews(previous);
				throw error;
			}
		},
		[personalViews, setPersonalViews]
	);

	const deleteView = useCallback(
		async (viewId: string) => {
			const previous = personalViews;
			setPersonalViews(personalViews.filter((view) => view.id !== viewId));
			try {
				await deletePersonalViewAction({ data: { viewId } });
			} catch (error) {
				setPersonalViews(previous);
				throw error;
			}
		},
		[personalViews, setPersonalViews]
	);

	const togglePin = useCallback(
		async (viewId: string) => {
			const view = personalViews.find((v) => v.id === viewId);
			if (!view) return;
			const previous = personalViews;
			const nextPinned = !view.pinned;
			setPersonalViews(personalViews.map((v) => (v.id === viewId ? { ...v, pinned: nextPinned } : v)));
			try {
				await togglePersonalViewPinAction({ data: { viewId, pinned: nextPinned } });
			} catch (error) {
				setPersonalViews(previous);
				throw error;
			}
		},
		[personalViews, setPersonalViews]
	);

	/** Rewrites position (0..n) to match `orderedIds`' order — same batch-rewrite the DB function does. */
	const reorder = useCallback(
		async (orderedIds: string[]) => {
			const previous = personalViews;
			const byId = new Map(personalViews.map((view) => [view.id, view]));
			const reordered = orderedIds
				.map((id, index) => {
					const view = byId.get(id);
					return view ? { ...view, position: index } : undefined;
				})
				.filter((view): view is schema.savedViewType => !!view);
			setPersonalViews(reordered);
			try {
				await reorderPersonalViewsAction({ data: { orderedIds } });
			} catch (error) {
				setPersonalViews(previous);
				throw error;
			}
		},
		[personalViews, setPersonalViews]
	);

	return { personalViews, createView, renameView, deleteView, togglePin, reorder };
}

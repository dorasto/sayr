"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { generateSlug } from "@repo/util";
import { useCallback, useMemo } from "react";
import { createSavedViewAction, deleteSavedViewAction, updateSavedViewAction } from "@/lib/fetches/organization";
import type { SavedViewCreateInput, SavedViewsSource, SavedViewUpdates } from "./saved-views-source";

interface OrgSavedViewsOptions {
	organizationId: string;
	/** The org's live saved views (e.g. `useLayoutOrganization().views`). */
	views: readonly schema.savedViewType[];
	/** Replaces the org's view list — every endpoint answers with the org's full updated list. */
	setViews: (views: schema.savedViewType[]) => void;
	/** Whether another view may be saved (the plan limit). Absent = true. */
	canCreate?: boolean;
	/** Shown instead of the save action when `canCreate` is false. */
	limitMessage?: string;
}

type SavedViewsResult = Awaited<ReturnType<typeof createSavedViewAction>>;

/** The endpoints report failures as `success: false`; the switcher/popovers toast on a throw. */
function unwrap(result: SavedViewsResult, fallback: string): schema.savedViewType[] {
	if (!result.success) throw new Error(result.error || fallback);
	return result.data;
}

/**
 * An organization's shared saved views as a `SavedViewsSource` for the board's view UI (switcher, panel
 * header, save/edit popovers). Field mapping matches the old org filter dropdown's NewViewPopover:
 * `filterParams` travels as `value`, the slug is derived from the name on create (and kept on rename, so a
 * `?view=<slug>` link keeps working), `logo` is empty. Org views have no pinning (the Favourites sidebar is
 * personal-only), so there is no `togglePin` and the panel's pin button hides.
 */
export function useOrgSavedViewsSource({
	organizationId,
	views,
	setViews,
	canCreate,
	limitMessage,
}: OrgSavedViewsOptions): SavedViewsSource {
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const create = useCallback(
		async (input: SavedViewCreateInput) => {
			const slug = generateSlug(input.name);
			const next = unwrap(
				await createSavedViewAction(
					organizationId,
					{ name: input.name, slug, logo: "", value: input.filterParams, viewConfig: input.viewConfig ?? null },
					sseClientId
				),
				"Failed to create view"
			);
			setViews(next);
			return next.find((view) => view.slug === slug);
		},
		[organizationId, sseClientId, setViews]
	);

	const update = useCallback(
		async (viewId: string, updates: SavedViewUpdates) => {
			const next = unwrap(
				await updateSavedViewAction(
					organizationId,
					{ id: viewId, name: updates.name, value: updates.filterParams, viewConfig: updates.viewConfig },
					sseClientId
				),
				"Failed to update view"
			);
			setViews(next);
		},
		[organizationId, sseClientId, setViews]
	);

	const remove = useCallback(
		async (viewId: string) => {
			const next = unwrap(
				await deleteSavedViewAction(organizationId, { id: viewId }, sseClientId),
				"Failed to delete view"
			);
			setViews(next);
		},
		[organizationId, sseClientId, setViews]
	);

	return useMemo<SavedViewsSource>(
		() => ({ kind: "org", views, create, update, remove, canCreate, limitMessage }),
		[views, create, update, remove, canCreate, limitMessage]
	);
}

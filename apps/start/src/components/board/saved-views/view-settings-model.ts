// Pure logic for the view settings sheet (view-settings-sheet.tsx): slug handling, the "anything changed?"
// check and the preview. Kept free of `@/` imports so vitest can run it.

import type { schema } from "@repo/database";
import type { BoardItem } from "../core/board-item";
import { type ArrangingEntity, arrangeBoardItems } from "../core/entity";
import { areViewConfigsEqual, DEFAULT_FILTER_STATE, mapViewConfigToState } from "../core/view-config";
import { deserializeFilters, serializeFilters } from "../filter/serialization";

type ViewConfig = NonNullable<schema.savedViewType["viewConfig"]>;

/**
 * Normalises slug input as it's typed: lowercase, spaces to hyphens, anything but word characters and hyphens
 * dropped, runs of hyphens collapsed. Leading/trailing hyphens are kept so typing "my-" doesn't fight the user;
 * `resolveSlugUpdate` trims them on save.
 */
export function normalizeViewSlugInput(text: string): string {
	return text
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-");
}

/**
 * The slug to save, or `undefined` when there's nothing to change: the field is empty (a slug can't be cleared —
 * the view would fall back to its id and break existing `?view=` links) or equals the current slug.
 */
export function resolveSlugUpdate(input: string, currentSlug: string | null): string | undefined {
	const slug = normalizeViewSlugInput(input).replace(/^-+|-+$/g, "");
	if (!slug || slug === (currentSlug ?? "")) return undefined;
	return slug;
}

/** Whether another view in the same list is already addressed by `slug` (its slug, or its id). */
export function isViewSlugTaken(
	slug: string,
	views: readonly { id: string; slug: string | null }[],
	viewId: string
): boolean {
	return views.some((view) => view.id !== viewId && (view.slug === slug || view.id === slug));
}

/** What the sheet edits: the view's name, slug field, filter params and (form-normalised) view config. */
export interface ViewDraft {
	name: string;
	slug: string;
	filterParams: string;
	viewConfig: ViewConfig;
}

/**
 * Canonical form of serialised filters for comparison: conditions only (the builder's condition ids aren't
 * serialised), and no empty groups, so adding then removing a condition reads as unchanged.
 */
function normalizeFilterParams(params: string): string {
	const state = deserializeFilters(params) ?? DEFAULT_FILTER_STATE;
	return serializeFilters({ ...state, groups: state.groups.filter((group) => group.conditions.length > 0) });
}

/** Whether saving `draft` would change `saved` (both with the view config already form-normalised). */
export function isViewDraftChanged(saved: ViewDraft, draft: ViewDraft): boolean {
	return (
		draft.name.trim() !== saved.name ||
		resolveSlugUpdate(draft.slug, saved.slug || null) !== undefined ||
		normalizeFilterParams(draft.filterParams) !== normalizeFilterParams(saved.filterParams) ||
		!areViewConfigsEqual(mapViewConfigToState(draft.viewConfig), mapViewConfigToState(saved.viewConfig)) ||
		(draft.viewConfig.icon ?? "") !== (saved.viewConfig.icon ?? "") ||
		(draft.viewConfig.color ?? "") !== (saved.viewConfig.color ?? "")
	);
}

/** How many items the sheet's preview lists before "+ N more". */
export const VIEW_PREVIEW_LIMIT = 3;

export interface ViewPreview<T> {
	/** Everything the view would show. */
	total: number;
	/** The first `limit` of them, in the view's order. */
	items: readonly T[];
	/** `total` minus the listed ones. */
	more: number;
}

/**
 * What a (draft) saved view would show on this board: the board's own `arrangeBoardItems` pipeline (filters,
 * completed visibility, sort — what `Board` renders) run with the draft's filter params and view config.
 */
export function buildViewPreview<T extends BoardItem>(
	entity: ArrangingEntity<T>,
	items: readonly T[],
	{ filterParams, viewConfig }: Pick<ViewDraft, "filterParams" | "viewConfig">,
	{ ownsMembership = false, limit = VIEW_PREVIEW_LIMIT }: { ownsMembership?: boolean; limit?: number } = {}
): ViewPreview<T> {
	const { showCompletedTasks, sortBy = "none", sortDirection = "asc" } = mapViewConfigToState(viewConfig);
	const arranged = arrangeBoardItems(entity, items, {
		filters: deserializeFilters(filterParams) ?? DEFAULT_FILTER_STATE,
		showCompleted: showCompletedTasks,
		sortBy,
		sortDirection,
		ownsMembership,
	});
	return {
		total: arranged.length,
		items: arranged.slice(0, limit),
		more: Math.max(0, arranged.length - limit),
	};
}

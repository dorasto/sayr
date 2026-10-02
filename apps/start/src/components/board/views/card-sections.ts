import { NONE_COLUMN_ID, NONE_GROUPING_ID } from "../config/grouping-registry";

// Pure derivations for the card view (views/board-card-view.tsx): how grouped columns become
// sections, and which sections start collapsed. Relative, type-light imports so vitest can run it.

/** The slice of a grouped column the card view needs. */
export interface CardGroupLike<T> {
	id: string;
	tasks: readonly T[];
}

export type CardLayout<G extends CardGroupLike<unknown>> =
	| { kind: "flat"; groups: readonly G[] }
	| { kind: "sections"; groups: readonly G[] };

/**
 * One headerless grid ("flat") for the "none" grouping or when the grouping yielded a single catch-all
 * column; otherwise one collapsible section per group ("sections").
 */
export function deriveCardLayout<G extends CardGroupLike<unknown>>(
	grouping: string,
	groups: readonly G[]
): CardLayout<G> {
	const isCatchAll = groups.length === 1 && groups[0]?.id === NONE_COLUMN_ID;
	return grouping === NONE_GROUPING_ID || isCatchAll ? { kind: "flat", groups } : { kind: "sections", groups };
}

/** Empty groups start collapsed (like the list view), so a hidden Done/Canceled never sits open-but-empty. */
export function getDefaultCollapsedGroupIds(groups: readonly CardGroupLike<unknown>[]): Set<string> {
	return new Set(groups.filter((group) => group.tasks.length === 0).map((group) => group.id));
}

/** Returns a new set with `id` toggled; never mutates `collapsed`. */
export function toggleCollapsedId(collapsed: ReadonlySet<string>, id: string): Set<string> {
	const next = new Set(collapsed);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	return next;
}

/** The flat list of items a "flat" layout renders (all groups, in order). */
export function flattenCardGroups<T>(groups: readonly CardGroupLike<T>[]): T[] {
	return groups.flatMap((group) => group.tasks);
}

export interface CardLoadMoreState {
	visible: boolean;
	label: string;
	disabled: boolean;
}

/** The footer button's state from the data source's pagination (absent/finished = hidden). */
export function getLoadMoreState(
	pagination: { hasMore: boolean; isFetchingMore: boolean; loadMoreLabel?: string } | undefined
): CardLoadMoreState {
	return {
		visible: pagination?.hasMore === true,
		label: pagination?.loadMoreLabel ?? "Show more",
		disabled: pagination?.isFetchingMore === true,
	};
}

import { type ReactNode, useMemo } from "react";
import { useBoardEntity, useBoardGroupings, useBoardOrganizationScope } from "../core/board-data";
import type { TaskGroupingId } from "../filter/types";
import { resolveGroupingDefinition } from "./grouping-registry";
import { DEFAULT_GROUPING_REGISTRY, TASK_GROUPING_MENU } from "./groupings";

// Board's own "group by" menu options — one entry per TaskGroupingId, a
// single representative icon per grouping (not per value, unlike
// STATUS_CONFIG/PRIORITY_CONFIG). Derived from the built-in grouping registry
// (config/groupings.tsx, which owns each grouping's label and icon — they match
// the glyph the equivalent field picker uses elsewhere, field-category.tsx/
// field-release.tsx, so the menu stays visually consistent with the fields it
// groups by). The "none" built-in is a page-local grouping and is not offered here.

export const TASK_GROUPING_OPTIONS: Array<{ id: TaskGroupingId; label: string; icon: ReactNode }> =
	TASK_GROUPING_MENU.map((id) => {
		const { label, icon } = resolveGroupingDefinition(DEFAULT_GROUPING_REGISTRY, id);
		return { id, label, icon };
	});

export const TASK_GROUPINGS: Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]> = Object.fromEntries(
	TASK_GROUPING_OPTIONS.map((option) => [option.id, option])
) as Record<TaskGroupingId, (typeof TASK_GROUPING_OPTIONS)[number]>;

/** One "Group by" menu entry. */
export interface BoardGroupingOption {
	id: TaskGroupingId;
	label: string;
	icon: ReactNode;
}

/**
 * The "Group by" menu for the enclosing board: the entity's `groupingMenu` (tasks: the six persistable ids
 * above), labels/icons from the board's registry, without `org` on a single-org board (one org = one group).
 */
export function useBoardGroupingOptions(): readonly BoardGroupingOption[] {
	const { groupingMenu } = useBoardEntity();
	const registry = useBoardGroupings();
	const singleOrg = useBoardOrganizationScope() !== undefined;
	return useMemo(
		() =>
			groupingMenu
				.filter((id) => !(singleOrg && id === "org"))
				.map((id) => {
					const { label, icon } = resolveGroupingDefinition(registry, id);
					return { id, label, icon };
				}),
		[groupingMenu, registry, singleOrg]
	);
}

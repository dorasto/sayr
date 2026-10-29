import { type ReactNode, useMemo } from "react";
import { useBoardEntity, useBoardGroupings, useBoardOrganizationScope } from "../core/board-data";
import type { TaskGroupingId } from "../filter/types";
import { resolveGroupingDefinition } from "./grouping-registry";

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

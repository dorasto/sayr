import type { TaskGroup, TaskGroupingContext, TaskGroupingId } from "../filter/types";
import { TASK_GROUPINGS } from "./config";

export interface NestedTaskGroup extends TaskGroup {
	subGroups?: TaskGroup[];
}

/**
 * Apply nested grouping to tasks
 * 
 * @param grouping - Primary grouping field
 * @param subGrouping - Secondary grouping field (or "none")
 * @param context - Grouping context (users, categories, etc.)
 * @returns Array of nested task groups
 */
export function applyNestedGrouping(
	grouping: TaskGroupingId,
	subGrouping: TaskGroupingId | "none" | undefined,
	context: TaskGroupingContext,
): NestedTaskGroup[] {
	// If no sub-grouping, just return regular grouping
	if (!subGrouping || subGrouping === "none") {
		const primaryGrouping = TASK_GROUPINGS[grouping] ?? TASK_GROUPINGS.status;
		return primaryGrouping.group(context);
	}

	// Get grouping definitions
	const primaryGrouping = TASK_GROUPINGS[grouping] ?? TASK_GROUPINGS.status;
	const secondaryGrouping = TASK_GROUPINGS[subGrouping];

	if (!secondaryGrouping) {
		return primaryGrouping.group(context);
	}

	// First, apply primary grouping
	const primaryGroups = primaryGrouping.group(context);

	// For each primary group, apply secondary grouping to its tasks
	const nestedGroups: NestedTaskGroup[] = primaryGroups.map((primaryGroup) => {
		// Apply secondary grouping to this group's tasks
		const subGroups = secondaryGrouping.group({
			...context,
			tasks: primaryGroup.tasks,
		});

		return {
			...primaryGroup,
			subGroups,
			// Keep the original tasks at the top level for compatibility
			tasks: primaryGroup.tasks,
		};
	});

	return nestedGroups;
}

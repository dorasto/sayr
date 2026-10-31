import type { schema } from "@repo/database";
import type { FilterState } from "../../../../board/filter/types";
import { buildPresetFilters } from "../../../../board/layout/task-overview-model";

// Pure half of the org tasks page's fixed filters (one per category; "Your tasks" is the shared
// buildAssigneePresetFilters in board/layout/task-overview-model.ts) — shared by the view
// switcher's presets and the side panel's tiles so both agree on what "active" means. Relative/type-only
// imports so vitest can cover it (see org-task-presets.test.ts).

/** One category's tasks. */
export function buildCategoryPresetFilters(categoryId: string): FilterState {
	return buildPresetFilters(`category-${categoryId}`, "category", categoryId);
}

type CountableTask = Pick<schema.TaskWithLabels, "status" | "category"> & {
	assignees: readonly Pick<schema.UserSummary, "id">[];
};

function isOpen(task: CountableTask): boolean {
	return task.status !== "done" && task.status !== "canceled";
}

/** The panel tiles' counts: open tasks, open tasks assigned to the viewer, and every task per category. */
export function countOrgTasks(
	tasks: readonly CountableTask[],
	viewerId: string | undefined
): { open: number; openAssignedToViewer: number; byCategory: ReadonlyMap<string, number> } {
	let open = 0;
	let openAssignedToViewer = 0;
	const byCategory = new Map<string, number>();
	for (const task of tasks) {
		if (isOpen(task)) {
			open += 1;
			if (viewerId && task.assignees.some((assignee) => assignee.id === viewerId)) openAssignedToViewer += 1;
		}
		if (task.category) byCategory.set(task.category, (byCategory.get(task.category) ?? 0) + 1);
	}
	return { open, openAssignedToViewer, byCategory };
}

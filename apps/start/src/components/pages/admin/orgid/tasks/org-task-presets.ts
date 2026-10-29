import type { schema } from "@repo/database";
import type { FilterField, FilterState } from "../../../../board/filter/types";

// Pure half of the org tasks page's fixed filters ("Your tasks", one per category) — shared by the view
// switcher's presets and the side panel's tiles so both agree on what "active" means. Relative/type-only
// imports so vitest can cover it (see org-task-presets.test.ts).

/** One `any`-match condition on `field`; the ids are stable so a preset is the same object shape every render. */
function singleValueFilter(presetId: string, field: FilterField, value: string): FilterState {
	return {
		operator: "AND",
		groups: [
			{
				id: `preset-${presetId}`,
				operator: "AND",
				conditions: [{ id: `preset-${presetId}-${field}`, field, operator: "any", value: [value] }],
			},
		],
	};
}

/** "Your tasks": assigned to `userId`. */
export function buildAssigneePresetFilters(userId: string): FilterState {
	return singleValueFilter("assignee", "assignee", userId);
}

/** One category's tasks. */
export function buildCategoryPresetFilters(categoryId: string): FilterState {
	return singleValueFilter(`category-${categoryId}`, "category", categoryId);
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

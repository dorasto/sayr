import { describe, expect, it } from "vitest";
import { areFiltersEqual } from "../../../../board/core/view-config";
import { buildAssigneePresetFilters, buildCategoryPresetFilters, countOrgTasks } from "./org-task-presets";

describe("org task presets", () => {
	it("builds a single any-match condition per preset", () => {
		expect(buildAssigneePresetFilters("u1").groups[0]?.conditions).toEqual([
			{ id: "preset-assignee-assignee", field: "assignee", operator: "any", value: ["u1"] },
		]);
		expect(buildCategoryPresetFilters("c1").groups[0]?.conditions[0]).toMatchObject({
			field: "category",
			operator: "any",
			value: ["c1"],
		});
	});

	it("equals the same filter built elsewhere, whatever its ids", () => {
		const fromQuickFilters = {
			operator: "AND" as const,
			groups: [
				{
					id: "group-0",
					operator: "AND" as const,
					conditions: [
						{ id: "filter-category-123", field: "category" as const, operator: "any" as const, value: ["c1"] },
					],
				},
			],
		};
		expect(areFiltersEqual(buildCategoryPresetFilters("c1"), fromQuickFilters)).toBe(true);
		expect(areFiltersEqual(buildCategoryPresetFilters("c2"), fromQuickFilters)).toBe(false);
	});
});

describe("countOrgTasks", () => {
	const tasks = [
		{ status: "todo", category: "c1", assignees: [{ id: "me" }] },
		{ status: "in-progress", category: null, assignees: [{ id: "other" }] },
		{ status: "done", category: "c1", assignees: [{ id: "me" }] },
		{ status: "canceled", category: "c2", assignees: [] },
		{ status: "backlog", category: "c1", assignees: [{ id: "other" }, { id: "me" }] },
	] as const;

	it("counts open tasks, the viewer's open tasks and every task per category", () => {
		const counts = countOrgTasks(tasks, "me");
		expect(counts.open).toBe(3);
		expect(counts.openAssignedToViewer).toBe(2);
		expect(counts.byCategory.get("c1")).toBe(3);
		expect(counts.byCategory.get("c2")).toBe(1);
		expect(counts.byCategory.get("c3")).toBeUndefined();
	});

	it("counts nothing as the viewer's without a viewer", () => {
		expect(countOrgTasks(tasks, undefined).openAssignedToViewer).toBe(0);
	});
});

import { describe, expect, it } from "vitest";
import type { FilterState } from "../filter/types";
import { arrangeBoardItems, formatEntityCount, scopeCompletedItems } from "./entity";

interface Item {
	id: string;
	done: boolean;
	rank: number;
}

const entity = {
	extractFilterValue: (item: Item, field: string) => (field === "done" ? String(item.done) : null),
	isCompleted: (item: Item) => item.done,
	sort: (items: readonly Item[], _sortBy: string, direction: "asc" | "desc") =>
		[...items].sort((a, b) => (direction === "desc" ? b.rank - a.rank : a.rank - b.rank)),
};

const items: Item[] = [
	{ id: "a", done: false, rank: 3 },
	{ id: "b", done: true, rank: 1 },
	{ id: "c", done: false, rank: 2 },
];
const NO_FILTERS: FilterState = { groups: [], operator: "AND" };
const ids = (list: readonly Item[]) => list.map((item) => item.id);

describe("arrangeBoardItems", () => {
	it("hides completed items unless shown, then sorts", () => {
		expect(
			ids(
				arrangeBoardItems(entity, items, {
					filters: NO_FILTERS,
					showCompleted: false,
					sortBy: "createdAt",
					sortDirection: "asc",
				})
			)
		).toEqual(["c", "a"]);
		expect(
			ids(
				arrangeBoardItems(entity, items, {
					filters: NO_FILTERS,
					showCompleted: true,
					sortBy: "createdAt",
					sortDirection: "desc",
				})
			)
		).toEqual(["a", "c", "b"]);
	});

	it("keeps the input order without a sort", () => {
		const arranged = arrangeBoardItems(entity, items, {
			filters: NO_FILTERS,
			showCompleted: true,
			sortBy: "none",
			sortDirection: "asc",
		});
		expect(arranged).toBe(items);
	});

	it("applies only the user's filters when the grouping owns membership", () => {
		const filters: FilterState = {
			operator: "AND",
			groups: [{ id: "g", operator: "AND", conditions: [{ id: "x", field: "status", operator: "any", value: [] }] }],
		};
		expect(
			ids(
				arrangeBoardItems(entity, items, {
					filters,
					showCompleted: false,
					sortBy: "createdAt",
					sortDirection: "asc",
					ownsMembership: true,
				})
			)
		).toEqual(["a", "b", "c"]);
	});
});

describe("scopeCompletedItems", () => {
	it("returns the same list when completed items are shown", () => {
		expect(scopeCompletedItems(entity, items, true)).toBe(items);
	});
});

describe("formatEntityCount", () => {
	it("picks the singular for one", () => {
		expect(formatEntityCount({ singular: "release", plural: "releases" }, 1)).toBe("1 release");
		expect(formatEntityCount({ singular: "task", plural: "tasks" }, 0)).toBe("0 tasks");
	});
});

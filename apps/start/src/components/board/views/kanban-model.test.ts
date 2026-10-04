import { describe, expect, it } from "vitest";
import type { BoardColumn } from "../config/grouping-registry";
import type { BoardItem } from "../core/board-item";
import { buildKanbanColumns, buildKanbanItems, buildKanbanRows, getGridItemId } from "./kanban-model";

const task = (id: string): BoardItem => ({ id });

function column(id: string, items: BoardItem[], extra: Partial<BoardColumn<BoardItem>> = {}): BoardColumn<BoardItem> {
	return { id, label: id.toUpperCase(), items, ...extra };
}

describe("getGridItemId", () => {
	it("is the bare item id without multi-membership", () => {
		expect(getGridItemId(task("t1"), "todo", undefined, false)).toBe("t1");
		expect(getGridItemId(task("t1"), "todo", "urgent", false)).toBe("t1");
	});

	it("bakes the cell into the id with multi-membership, 'none' standing in for a missing row", () => {
		expect(getGridItemId(task("t1"), "u-ann", undefined, true)).toBe("t1:u-ann:none");
		expect(getGridItemId(task("t1"), "u-ann", "urgent", true)).toBe("t1:u-ann:urgent");
	});
});

describe("buildKanbanColumns", () => {
	const columns = [
		column("todo", [task("a")], { icon: "i", header: "H", description: "D" }),
		column("done", []),
		column("canceled", [], { emptyMessage: "Nothing here" }),
	];

	it("drops empty columns by default", () => {
		expect(buildKanbanColumns(columns, false).map((c) => c.id)).toEqual(["todo"]);
	});

	it("keeps empty columns, with their counts and presentation fields, when asked", () => {
		const built = buildKanbanColumns(columns, true);
		expect(built.map((c) => [c.id, c.count])).toEqual([
			["todo", 1],
			["done", 0],
			["canceled", 0],
		]);
		expect(built[0]).toMatchObject({ label: "TODO", icon: "i", header: "H", description: "D" });
		expect(built[2]?.emptyMessage).toBe("Nothing here");
	});
});

describe("buildKanbanRows", () => {
	const rows = [
		column("urgent", [task("a")], { toneClassName: "bg-destructive/10", color: "#f00" }),
		column("low", []),
	];

	it("drops empty rows unless kept, carrying tone and color", () => {
		expect(buildKanbanRows(rows, false)).toEqual([
			{
				id: "urgent",
				label: "URGENT",
				count: 1,
				icon: undefined,
				toneClassName: "bg-destructive/10",
				color: "#f00",
			},
		]);
		expect(buildKanbanRows(rows, true).map((r) => r.id)).toEqual(["urgent", "low"]);
	});
});

describe("buildKanbanItems", () => {
	const multi = task("t1");
	const columns = [
		column("u-ann", [multi, task("t2")], {
			subGroups: [column("urgent", [multi]), column("low", [task("t2")])],
		}),
		column("u-bob", [multi], { subGroups: [column("urgent", [multi]), column("low", [])] }),
	];

	it("emits one item per card per column without sub-groups, with bare ids", () => {
		const items = buildKanbanItems(columns, { hasSubGroups: false, multiMembership: false });
		expect(items.map((i) => [i.id, i.columnId, i.rowId])).toEqual([
			["t1", "u-ann", undefined],
			["t2", "u-ann", undefined],
			["t1", "u-bob", undefined],
		]);
	});

	it("emits one item per cell with sub-groups, taking the cell from the sub-group", () => {
		const items = buildKanbanItems(columns, { hasSubGroups: true, multiMembership: false });
		expect(items.map((i) => [i.taskId, i.columnId, i.rowId])).toEqual([
			["t1", "u-ann", "urgent"],
			["t2", "u-ann", "low"],
			["t1", "u-bob", "urgent"],
		]);
	});

	it("gives a multi-membership item a distinct id in each cell it occupies", () => {
		const flat = buildKanbanItems(columns, { hasSubGroups: false, multiMembership: true });
		expect(flat.map((i) => i.id)).toEqual(["t1:u-ann:none", "t2:u-ann:none", "t1:u-bob:none"]);

		const nested = buildKanbanItems(columns, { hasSubGroups: true, multiMembership: true });
		expect(nested.map((i) => i.id)).toEqual(["t1:u-ann:urgent", "t2:u-ann:low", "t1:u-bob:urgent"]);
		expect(new Set(nested.map((i) => i.id)).size).toBe(nested.length);
	});

	it("treats a column without sub-groups as empty when sub-grouped", () => {
		expect(buildKanbanItems([column("x", [task("a")])], { hasSubGroups: true, multiMembership: false })).toEqual([]);
	});
});

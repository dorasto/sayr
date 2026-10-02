import { describe, expect, it } from "vitest";
import {
	type BoardTask,
	countByTab,
	filterBoardTasks,
	getTabStatuses,
	matchesTab,
	sortBoardTasks,
} from "./board-filters";

const task = (id: string, overrides: Partial<BoardTask> = {}): BoardTask => ({
	id,
	status: "backlog",
	category: null,
	labels: [],
	voteCount: 0,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	...overrides,
});

const tasks = [
	task("backlog", { status: "backlog", category: "c1", labels: [{ id: "l1" }] }),
	task("todo", { status: "todo", category: "c2" }),
	task("progress", { status: "in-progress", labels: [{ id: "l1" }, { id: "l2" }] }),
	task("done", { status: "done", category: "c1" }),
	task("canceled", { status: "canceled" }),
];

describe("tabs", () => {
	it("maps tabs to status sets", () => {
		expect(getTabStatuses("active")).toEqual(["backlog", "todo", "in-progress"]);
		expect(getTabStatuses("done")).toEqual(["done"]);
		expect(getTabStatuses("all")).toBeNull();
	});

	it("hides canceled everywhere except All + an explicit status filter", () => {
		expect(matchesTab({ status: "canceled" }, "active")).toBe(false);
		expect(matchesTab({ status: "canceled" }, "done")).toBe(false);
		expect(matchesTab({ status: "canceled" }, "all")).toBe(false);
		expect(matchesTab({ status: "canceled" }, "all", ["canceled"])).toBe(true);
	});

	it("counts loaded tasks per tab", () => {
		expect(countByTab(tasks)).toEqual({ active: 3, done: 1, all: 4 });
	});
});

describe("filterBoardTasks", () => {
	it("filters by tab", () => {
		expect(filterBoardTasks(tasks, { tab: "active" }).map((t) => t.id)).toEqual(["backlog", "todo", "progress"]);
		expect(filterBoardTasks(tasks, { tab: "done" }).map((t) => t.id)).toEqual(["done"]);
		expect(filterBoardTasks(tasks, { tab: "all" }).map((t) => t.id)).toEqual(["backlog", "todo", "progress", "done"]);
	});

	it("filters by category, labels (any-of) and status", () => {
		expect(filterBoardTasks(tasks, { tab: "all", categoryId: "c1" }).map((t) => t.id)).toEqual(["backlog", "done"]);
		expect(filterBoardTasks(tasks, { tab: "all", labelIds: ["l2", "l9"] }).map((t) => t.id)).toEqual(["progress"]);
		expect(filterBoardTasks(tasks, { tab: "all", labelIds: ["l1"] }).map((t) => t.id)).toEqual([
			"backlog",
			"progress",
		]);
		expect(filterBoardTasks(tasks, { tab: "all", statuses: ["todo", "done"] }).map((t) => t.id)).toEqual([
			"todo",
			"done",
		]);
	});

	it("shows canceled posts under All when filtered to them", () => {
		expect(filterBoardTasks(tasks, { tab: "all", statuses: ["canceled"] }).map((t) => t.id)).toEqual(["canceled"]);
		expect(filterBoardTasks(tasks, { tab: "active", statuses: ["canceled"] })).toEqual([]);
	});

	it("treats empty filter arrays as no filter", () => {
		expect(filterBoardTasks(tasks, { tab: "all", labelIds: [], statuses: [], categoryId: null })).toHaveLength(4);
	});
});

describe("sortBoardTasks", () => {
	const list = [
		task("a", { voteCount: 5, createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" }),
		task("b", { voteCount: 9, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-05T00:00:00Z" }),
		task("c", { voteCount: 5, createdAt: "2026-01-03T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" }),
	];

	it("sorts by newest, most popular (newest breaks ties) and recently updated without mutating", () => {
		expect(sortBoardTasks(list, "newest").map((t) => t.id)).toEqual(["c", "a", "b"]);
		expect(sortBoardTasks(list, "mostPopular").map((t) => t.id)).toEqual(["b", "c", "a"]);
		expect(sortBoardTasks(list, "updated").map((t) => t.id)).toEqual(["a", "c", "b"]);
		expect(list.map((t) => t.id)).toEqual(["a", "b", "c"]);
	});
});

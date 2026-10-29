import { describe, expect, it } from "vitest";
import { serializeFilters } from "../filter/serialization";
import type { FilterState } from "../filter/types";
import {
	buildViewPreview,
	isViewDraftChanged,
	isViewSlugTaken,
	normalizeViewSlugInput,
	resolveSlugUpdate,
	type ViewDraft,
} from "./view-settings-model";

describe("normalizeViewSlugInput", () => {
	it("lowercases, hyphenates spaces and drops other characters", () => {
		expect(normalizeViewSlugInput("My Open Bugs!")).toBe("my-open-bugs");
	});

	it("collapses runs of hyphens", () => {
		expect(normalizeViewSlugInput("a -- b")).toBe("a-b");
	});

	it("keeps a trailing hyphen (or a just-typed space) while typing", () => {
		expect(normalizeViewSlugInput("my-")).toBe("my-");
		expect(normalizeViewSlugInput("my ")).toBe("my-");
	});

	it("doesn't add any prefix", () => {
		expect(normalizeViewSlugInput("todo-view-test")).toBe("todo-view-test");
	});
});

describe("resolveSlugUpdate", () => {
	it("returns the new slug when it changed", () => {
		expect(resolveSlugUpdate("open-bugs", "todo-view-test")).toBe("open-bugs");
	});

	it("returns undefined when unchanged", () => {
		expect(resolveSlugUpdate("todo-view-test", "todo-view-test")).toBeUndefined();
	});

	it("returns undefined for an empty field (a slug can't be cleared)", () => {
		expect(resolveSlugUpdate("", "todo-view-test")).toBeUndefined();
		expect(resolveSlugUpdate("---", "todo-view-test")).toBeUndefined();
		expect(resolveSlugUpdate("", null)).toBeUndefined();
	});

	it("trims leading and trailing hyphens", () => {
		expect(resolveSlugUpdate("-open-bugs-", null)).toBe("open-bugs");
	});

	it("sets a first slug on a view that had none", () => {
		expect(resolveSlugUpdate("my-view", null)).toBe("my-view");
	});
});

describe("isViewSlugTaken", () => {
	const views = [
		{ id: "1", slug: "alpha" },
		{ id: "2", slug: null },
		{ id: "3", slug: "gamma" },
	];

	it("is true when another view has the slug", () => {
		expect(isViewSlugTaken("alpha", views, "3")).toBe(true);
	});

	it("is true when another view is addressed by that id", () => {
		expect(isViewSlugTaken("2", views, "3")).toBe(true);
	});

	it("ignores the view being edited", () => {
		expect(isViewSlugTaken("gamma", views, "3")).toBe(false);
	});

	it("is false for a free slug", () => {
		expect(isViewSlugTaken("delta", views, "3")).toBe(false);
	});
});

const statusFilter = (statuses: string[], id = "c1"): FilterState => ({
	operator: "AND",
	groups: [{ id: "g", operator: "AND", conditions: [{ id, field: "status", operator: "any", value: statuses }] }],
});

const saved: ViewDraft = {
	name: "Open bugs",
	slug: "open-bugs",
	filterParams: serializeFilters(statusFilter(["todo"])),
	viewConfig: { mode: "list", groupBy: "status", showCompletedTasks: false, icon: "IconBug", color: "red" },
};

describe("isViewDraftChanged", () => {
	it("is false for the saved values, even with fresh condition ids or surrounding whitespace in the name", () => {
		expect(isViewDraftChanged(saved, { ...saved })).toBe(false);
		expect(
			isViewDraftChanged(saved, {
				...saved,
				name: " Open bugs ",
				filterParams: serializeFilters(statusFilter(["todo"], "fresh-id")),
			})
		).toBe(false);
	});

	it("treats an emptied filter list as no filters", () => {
		const empty: FilterState = { operator: "AND", groups: [{ id: "g", operator: "AND", conditions: [] }] };
		expect(
			isViewDraftChanged({ ...saved, filterParams: "" }, { ...saved, filterParams: serializeFilters(empty) })
		).toBe(false);
	});

	it("treats a missing sort as none / asc", () => {
		expect(
			isViewDraftChanged(saved, {
				...saved,
				viewConfig: { ...saved.viewConfig, sortBy: "none", sortDirection: "asc", subGroupBy: "none" },
			})
		).toBe(false);
	});

	it("is true when any edited field changes", () => {
		expect(isViewDraftChanged(saved, { ...saved, name: "Bugs" })).toBe(true);
		expect(isViewDraftChanged(saved, { ...saved, slug: "bugs" })).toBe(true);
		expect(isViewDraftChanged(saved, { ...saved, filterParams: serializeFilters(statusFilter(["done"])) })).toBe(
			true
		);
		expect(isViewDraftChanged(saved, { ...saved, viewConfig: { ...saved.viewConfig, mode: "kanban" } })).toBe(true);
		expect(isViewDraftChanged(saved, { ...saved, viewConfig: { ...saved.viewConfig, sortBy: "priority" } })).toBe(
			true
		);
		expect(isViewDraftChanged(saved, { ...saved, viewConfig: { ...saved.viewConfig, color: "blue" } })).toBe(true);
	});

	it("ignores a cleared slug field (a slug can't be cleared)", () => {
		expect(isViewDraftChanged(saved, { ...saved, slug: "" })).toBe(false);
	});
});

describe("buildViewPreview", () => {
	interface Item {
		id: string;
		status: string;
		rank: number;
	}
	const entity = {
		extractFilterValue: (item: Item, field: string) => (field === "status" ? item.status : null),
		isCompleted: (item: Item) => item.status === "done",
		sort: (items: readonly Item[], _sortBy: string, direction: "asc" | "desc") =>
			[...items].sort((a, b) => (direction === "desc" ? b.rank - a.rank : a.rank - b.rank)),
	};
	const items: Item[] = [
		{ id: "a", status: "todo", rank: 4 },
		{ id: "b", status: "done", rank: 1 },
		{ id: "c", status: "todo", rank: 2 },
		{ id: "d", status: "backlog", rank: 3 },
		{ id: "e", status: "todo", rank: 5 },
		{ id: "f", status: "todo", rank: 0 },
	];
	const ids = (list: readonly Item[]) => list.map((item) => item.id);
	const config = { mode: "list", groupBy: "status", showCompletedTasks: false } as const;

	it("applies the draft's filters, completed visibility and sort, and lists the first three", () => {
		const preview = buildViewPreview(entity, items, {
			filterParams: serializeFilters(statusFilter(["todo"])),
			viewConfig: { ...config, sortBy: "priority", sortDirection: "desc" },
		});
		expect(preview.total).toBe(4);
		expect(ids(preview.items)).toEqual(["e", "a", "c"]);
		expect(preview.more).toBe(1);
	});

	it("keeps completed items when shown and leaves the order alone without a sort", () => {
		const preview = buildViewPreview(entity, items, {
			filterParams: "",
			viewConfig: { ...config, showCompletedTasks: true },
		});
		expect(preview.total).toBe(6);
		expect(ids(preview.items)).toEqual(["a", "b", "c"]);
		expect(preview.more).toBe(3);
	});

	it("reports nothing matching", () => {
		const preview = buildViewPreview(entity, items, {
			filterParams: serializeFilters(statusFilter(["canceled"])),
			viewConfig: config,
		});
		expect(preview).toEqual({ total: 0, items: [], more: 0 });
	});

	it("skips completed visibility and sort when the grouping owns membership", () => {
		const preview = buildViewPreview(
			entity,
			items,
			{ filterParams: "", viewConfig: { ...config, sortBy: "priority" } },
			{ ownsMembership: true, limit: 2 }
		);
		expect(ids(preview.items)).toEqual(["a", "b"]);
		expect(preview.more).toBe(4);
	});
});

import { describe, expect, it } from "vitest";
import { NONE_COLUMN_ID } from "../config/grouping-registry";
import {
	deriveCardLayout,
	flattenCardGroups,
	getDefaultCollapsedGroupIds,
	getLoadMoreState,
	toggleCollapsedId,
} from "./card-sections";

const group = (id: string, tasks: string[]) => ({ id, tasks });

describe("deriveCardLayout", () => {
	it("is flat for the none grouping", () => {
		expect(deriveCardLayout("none", [group(NONE_COLUMN_ID, ["a"])]).kind).toBe("flat");
	});

	it("is flat when a grouping yields one catch-all column", () => {
		expect(deriveCardLayout("status", [group(NONE_COLUMN_ID, ["a"])]).kind).toBe("flat");
	});

	it("is sections for a real grouping", () => {
		expect(deriveCardLayout("status", [group("todo", ["a"]), group("done", [])]).kind).toBe("sections");
	});

	it("keeps a single real group as a section", () => {
		expect(deriveCardLayout("status", [group("todo", ["a"])]).kind).toBe("sections");
	});

	it("keeps the groups it was given", () => {
		const groups = [group("todo", ["a"])];
		expect(deriveCardLayout("status", groups).groups).toBe(groups);
	});
});

describe("getDefaultCollapsedGroupIds", () => {
	it("collapses only the empty groups", () => {
		expect(getDefaultCollapsedGroupIds([group("todo", ["a"]), group("done", []), group("canceled", [])])).toEqual(
			new Set(["done", "canceled"])
		);
	});

	it("collapses nothing when every group has items", () => {
		expect(getDefaultCollapsedGroupIds([group("todo", ["a"])]).size).toBe(0);
	});
});

describe("toggleCollapsedId", () => {
	it("adds a missing id and removes a present one without mutating the input", () => {
		const start = new Set(["a"]);
		const added = toggleCollapsedId(start, "b");
		expect(added).toEqual(new Set(["a", "b"]));
		expect(toggleCollapsedId(added, "a")).toEqual(new Set(["b"]));
		expect(start).toEqual(new Set(["a"]));
	});
});

describe("flattenCardGroups", () => {
	it("concatenates every group's tasks in order", () => {
		expect(flattenCardGroups([group("a", ["1", "2"]), group("b", []), group("c", ["3"])])).toEqual(["1", "2", "3"]);
	});
});

describe("getLoadMoreState", () => {
	it("is hidden without pagination or when there is no more", () => {
		expect(getLoadMoreState(undefined).visible).toBe(false);
		expect(getLoadMoreState({ hasMore: false, isFetchingMore: false }).visible).toBe(false);
	});

	it("shows with the default label", () => {
		expect(getLoadMoreState({ hasMore: true, isFetchingMore: false })).toEqual({
			visible: true,
			label: "Show more",
			disabled: false,
		});
	});

	it("uses the data source's label and disables while fetching", () => {
		expect(getLoadMoreState({ hasMore: true, isFetchingMore: true, loadMoreLabel: "Show more posts" })).toEqual({
			visible: true,
			label: "Show more posts",
			disabled: true,
		});
	});
});

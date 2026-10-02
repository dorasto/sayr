import { describe, expect, it } from "vitest";
import { type BoardViewDefinition, getBoardView, getViewOptionVisibility } from "./view-registry-model";

function makeView(id: string, supports: Partial<BoardViewDefinition["supports"]> = {}): BoardViewDefinition {
	return {
		id,
		label: id,
		icon: null,
		component: () => null,
		supports: { grouping: true, subGrouping: true, drag: true, sort: true, subtasks: "nested", ...supports },
	};
}

const LIST = makeView("list");
const KANBAN = makeView("kanban", { subtasks: "flat" });
const CARD = makeView("card", { subGrouping: false, drag: false, subtasks: "flat" });

describe("getBoardView", () => {
	it("returns the registered view for a known id", () => {
		expect(getBoardView("kanban", [LIST, KANBAN, CARD])).toBe(KANBAN);
		expect(getBoardView("card", [LIST, KANBAN, CARD])).toBe(CARD);
	});

	it("falls back to list for an unknown or missing id", () => {
		expect(getBoardView("gantt", [LIST, KANBAN, CARD])).toBe(LIST);
		expect(getBoardView(undefined, [LIST, KANBAN, CARD])).toBe(LIST);
	});

	it("falls back to list when the page doesn't register the requested (persisted) mode", () => {
		expect(getBoardView("card", [LIST, KANBAN])).toBe(LIST);
	});

	it("falls back to the first view when there is no list", () => {
		expect(getBoardView("kanban", [CARD])).toBe(CARD);
		expect(getBoardView("list", [CARD, KANBAN])).toBe(CARD);
	});

	it("resolves a page-local view id", () => {
		const local = makeView("roadmap");
		expect(getBoardView("roadmap", [LIST, local])).toBe(local);
	});

	it("throws on an empty registry", () => {
		expect(() => getBoardView("list", [])).toThrow();
	});
});

describe("getViewOptionVisibility", () => {
	const views = [LIST, KANBAN, CARD];

	it("shows everything for list and kanban", () => {
		expect(getViewOptionVisibility(views, LIST)).toEqual({
			showViewPicker: true,
			showGrouping: true,
			showSubGrouping: true,
			showSort: true,
		});
	});

	it("hides sub-grouping for a view that doesn't support it", () => {
		const visibility = getViewOptionVisibility(views, CARD);
		expect(visibility.showSubGrouping).toBe(false);
		expect(visibility.showGrouping).toBe(true);
	});

	it("hides grouping (and so sub-grouping) when grouping isn't supported", () => {
		const visibility = getViewOptionVisibility([LIST], makeView("flat", { grouping: false }));
		expect(visibility.showGrouping).toBe(false);
		expect(visibility.showSubGrouping).toBe(false);
	});

	it("hides sort when unsupported", () => {
		expect(getViewOptionVisibility(views, makeView("x", { sort: false })).showSort).toBe(false);
	});

	it("hides the view picker with a single registered view", () => {
		expect(getViewOptionVisibility([LIST], LIST).showViewPicker).toBe(false);
		expect(getViewOptionVisibility([LIST, CARD], LIST).showViewPicker).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import { applyFilterState } from "../../board/filter/filter-engine";
import {
	applyReleasePatch,
	buildReleaseStatusFilter,
	countReleasesByStatus,
	extractReleaseFieldValue,
	getReleaseStatusDropPatch,
	isReleaseArchived,
	type ReleaseItem,
	resolveReleaseDrop,
	sortReleases,
	visibleReleaseStatuses,
} from "./release-board-model";

const NOW = new Date("2026-10-29T12:00:00.000Z");

function release(overrides: Partial<ReleaseItem> = {}): ReleaseItem {
	return {
		id: "r1",
		organizationId: "org",
		name: "v1.0",
		slug: "v1-0",
		description: null,
		status: "planned",
		targetDate: null,
		releasedAt: null,
		color: null,
		icon: null,
		leadId: null,
		createdBy: null,
		createdAt: null,
		updatedAt: null,
		...overrides,
	};
}

describe("getReleaseStatusDropPatch", () => {
	it("returns null for the same status or a column that isn't a status", () => {
		expect(getReleaseStatusDropPatch(release({ status: "planned" }), "planned", NOW)).toBeNull();
		expect(getReleaseStatusDropPatch(release(), "__all__", NOW)).toBeNull();
	});

	it("stamps releasedAt when moving into Released without one", () => {
		expect(getReleaseStatusDropPatch(release({ status: "in-progress" }), "released", NOW)).toEqual({
			status: "released",
			releasedAt: NOW,
		});
	});

	it("keeps an existing releasedAt when moving into Released", () => {
		const releasedAt = new Date("2026-01-01T00:00:00.000Z");
		expect(getReleaseStatusDropPatch(release({ status: "archived", releasedAt }), "released", NOW)).toEqual({
			status: "released",
		});
	});

	it("clears releasedAt when moving out of Released", () => {
		const releasedAt = new Date("2026-01-01T00:00:00.000Z");
		expect(getReleaseStatusDropPatch(release({ status: "released", releasedAt }), "archived", NOW)).toEqual({
			status: "archived",
			releasedAt: null,
		});
	});

	it("only changes the status between non-released statuses", () => {
		expect(getReleaseStatusDropPatch(release({ status: "planned" }), "in-progress", NOW)).toEqual({
			status: "in-progress",
		});
	});
});

describe("resolveReleaseDrop", () => {
	it("moves releases only under the status grouping", () => {
		const item = release();
		expect(
			resolveReleaseDrop({ item, grouping: "status", groupId: "in-progress", subGrouping: "none" }, NOW)
		).toEqual({
			status: "in-progress",
		});
		expect(resolveReleaseDrop({ item, grouping: "none", groupId: "__all__", subGrouping: "none" }, NOW)).toBeNull();
	});

	it("applies to an optimistic copy", () => {
		const item = release({ status: "in-progress" });
		const patch = resolveReleaseDrop({ item, grouping: "status", groupId: "released", subGrouping: "none" }, NOW);
		expect(patch && applyReleasePatch(item, patch)).toEqual({ ...item, status: "released", releasedAt: NOW });
	});
});

describe("archived visibility", () => {
	it("treats only archived as completed", () => {
		expect(isReleaseArchived(release({ status: "archived" }))).toBe(true);
		expect(isReleaseArchived(release({ status: "released" }))).toBe(false);
	});

	it("drops the Archived column while archived releases are hidden", () => {
		expect(visibleReleaseStatuses(true)).toEqual(["planned", "in-progress", "released", "archived"]);
		expect(visibleReleaseStatuses(false)).toEqual(["planned", "in-progress", "released"]);
	});
});

describe("release filters", () => {
	const items = [
		release({ id: "a", status: "planned", name: "Alpha", targetDate: new Date("2026-03-10T10:00:00.000Z") }),
		release({ id: "b", status: "released", name: "Beta", releasedAt: new Date("2026-02-01T10:00:00.000Z") }),
		release({ id: "c", status: "archived", name: "Gamma", leadId: "u1" }),
	];
	const ids = (list: readonly ReleaseItem[]) => list.map((item) => item.id);

	it("extracts each field", () => {
		expect(extractReleaseFieldValue(items[2] as ReleaseItem, "lead")).toBe("u1");
		expect(extractReleaseFieldValue(items[0] as ReleaseItem, "title")).toBe("Alpha");
		expect(extractReleaseFieldValue(items[0] as ReleaseItem, "nope")).toBeNull();
	});

	it("filters by the status tile's filter", () => {
		expect(ids(applyFilterState(items, buildReleaseStatusFilter("released"), extractReleaseFieldValue))).toEqual([
			"b",
		]);
	});

	it("filters by target date with the shared date operators", () => {
		const state = {
			operator: "AND" as const,
			groups: [
				{
					id: "g",
					operator: "AND" as const,
					conditions: [
						{
							id: "c",
							field: "target_date" as const,
							operator: "before" as const,
							value: "2026-04-01T00:00:00.000Z",
						},
					],
				},
			],
		};
		expect(ids(applyFilterState(items, state, extractReleaseFieldValue))).toEqual(["a"]);
	});

	it("filters by empty target date and by name", () => {
		const empty = {
			operator: "AND" as const,
			groups: [
				{
					id: "g",
					operator: "AND" as const,
					conditions: [{ id: "c", field: "target_date" as const, operator: "empty" as const, value: null }],
				},
			],
		};
		expect(ids(applyFilterState(items, empty, extractReleaseFieldValue))).toEqual(["b", "c"]);
		const name = {
			operator: "AND" as const,
			groups: [
				{
					id: "g",
					operator: "AND" as const,
					conditions: [{ id: "c", field: "title" as const, operator: "contains" as const, value: "amm" }],
				},
			],
		};
		expect(ids(applyFilterState(items, name, extractReleaseFieldValue))).toEqual(["c"]);
	});
});

describe("sortReleases", () => {
	const early = release({ id: "early", name: "b", targetDate: new Date("2026-01-01") });
	const late = release({ id: "late", name: "a", targetDate: new Date("2026-06-01") });
	const undated = release({ id: "undated", name: "c" });
	const ids = (list: readonly ReleaseItem[]) => list.map((item) => item.id);

	it("sorts by target date with undated releases last in both directions", () => {
		expect(ids(sortReleases([undated, late, early], "targetDate", "asc"))).toEqual(["early", "late", "undated"]);
		expect(ids(sortReleases([undated, early, late], "targetDate", "desc"))).toEqual(["late", "early", "undated"]);
	});

	it("sorts by name", () => {
		expect(ids(sortReleases([undated, early, late], "name", "asc"))).toEqual(["late", "early", "undated"]);
	});

	it("leaves the order alone for a field releases don't have", () => {
		const list = [undated, early];
		expect(sortReleases(list, "priority", "asc")).toBe(list);
	});
});

describe("countReleasesByStatus", () => {
	it("counts every status, including empty ones", () => {
		expect(countReleasesByStatus([release(), release({ status: "released" }), release()])).toEqual({
			planned: 2,
			"in-progress": 0,
			released: 1,
			archived: 0,
		});
	});
});

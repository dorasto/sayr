import { describe, expect, it } from "vitest";
import {
	getReleaseDisplayDate,
	groupReleasesByMonth,
	isUpcomingStatus,
	sortReleasedReleases,
	sortUpcomingReleases,
} from "./changelog";

describe("isUpcomingStatus", () => {
	it("treats planned and in-progress as upcoming", () => {
		expect(isUpcomingStatus("planned")).toBe(true);
		expect(isUpcomingStatus("in-progress")).toBe(true);
		expect(isUpcomingStatus("released")).toBe(false);
		expect(isUpcomingStatus("archived")).toBe(false);
	});
});

describe("sortUpcomingReleases", () => {
	it("orders by soonest target date, undated last, and drops released and archived", () => {
		const sorted = sortUpcomingReleases([
			{ id: "undated", status: "planned", targetDate: null, createdAt: "2026-01-01" },
			{ id: "later", status: "planned", targetDate: "2026-12-01", createdAt: "2026-01-02" },
			{ id: "soon", status: "in-progress", targetDate: "2026-10-14", createdAt: "2026-01-03" },
			{ id: "shipped", status: "released", targetDate: "2026-01-01", createdAt: "2026-01-04" },
			{ id: "old", status: "archived", targetDate: "2026-01-01", createdAt: "2026-01-05" },
		]);
		expect(sorted.map((release) => release.id)).toEqual(["soon", "later", "undated"]);
	});
});

describe("sortReleasedReleases", () => {
	it("orders newest first using the date fallback chain", () => {
		const sorted = sortReleasedReleases([
			{ id: "a", status: "released", releasedAt: "2026-08-23", createdAt: "2026-01-01" },
			{ id: "b", status: "released", releasedAt: null, targetDate: "2026-09-11", createdAt: "2026-01-01" },
			{ id: "c", status: "released", releasedAt: null, targetDate: null, createdAt: "2026-09-22" },
			{ id: "d", status: "planned", releasedAt: null, targetDate: "2027-01-01", createdAt: "2026-01-01" },
		]);
		expect(sorted.map((release) => release.id)).toEqual(["c", "b", "a"]);
	});
});

describe("getReleaseDisplayDate", () => {
	it("uses the released date (with fallbacks) for released releases", () => {
		const result = getReleaseDisplayDate({ status: "released", releasedAt: null, targetDate: "2026-09-11" });
		expect(result.prefix).toBe("Released");
		expect(result.date?.toISOString().slice(0, 10)).toBe("2026-09-11");
	});

	it("uses the target date for upcoming releases and allows it to be missing", () => {
		const dated = getReleaseDisplayDate({ status: "in-progress", targetDate: "2026-10-14" });
		expect(dated.prefix).toBe("Target");
		expect(dated.date?.toISOString().slice(0, 10)).toBe("2026-10-14");
		expect(getReleaseDisplayDate({ status: "planned", targetDate: null }).date).toBeNull();
	});
});

describe("groupReleasesByMonth", () => {
	it("groups consecutive releases by display month, keeping order", () => {
		const releases = [
			{ id: "a", status: "released", releasedAt: "2026-04-17T10:00:00Z" },
			{ id: "b", status: "released", releasedAt: "2026-04-02T10:00:00Z" },
			{ id: "c", status: "released", releasedAt: "2026-03-30T10:00:00Z" },
		];
		const groups = groupReleasesByMonth(releases);
		expect(groups.map((group) => [group.label, group.releases.map((release) => release.id)])).toEqual([
			["April 2026", ["a", "b"]],
			["March 2026", ["c"]],
		]);
	});

	it("puts releases without any date under Undated", () => {
		expect(groupReleasesByMonth([{ status: "planned" }])[0]?.label).toBe("Undated");
	});
});

import { describe, expect, it } from "vitest";
import { formatBoardTime, formatShortDate, formatShortName, parseCsvParam, pickLatestRelease } from "./board-row";

const NOW = new Date("2026-10-02T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatBoardTime", () => {
	it("uses relative wording for recent posts", () => {
		expect(formatBoardTime(ago(2 * MIN), NOW)).toBe("just now");
		expect(formatBoardTime(ago(5 * MIN), NOW)).toBe("5 minutes ago");
		expect(formatBoardTime(ago(61 * MIN), NOW)).toBe("1 hour ago");
		expect(formatBoardTime(ago(5 * HOUR), NOW)).toBe("5 hours ago");
		expect(formatBoardTime(ago(3 * DAY), NOW)).toBe("3 days ago");
		expect(formatBoardTime(ago(8 * DAY), NOW)).toBe("1 week ago");
		expect(formatBoardTime(ago(22 * DAY), NOW)).toBe("3 weeks ago");
	});

	it("falls back to a short date after a few weeks", () => {
		expect(formatBoardTime(new Date("2026-04-26T10:00:00Z"), NOW)).toBe("26 Apr");
		expect(formatBoardTime(new Date("2025-12-01T10:00:00Z"), NOW)).toBe("1 Dec 2025");
	});

	it("accepts ISO strings and tolerates bad input", () => {
		expect(formatBoardTime(ago(3 * DAY).toISOString(), NOW)).toBe("3 days ago");
		expect(formatBoardTime(null, NOW)).toBe("");
		expect(formatBoardTime("not a date", NOW)).toBe("");
		expect(formatBoardTime(new Date(NOW.getTime() + HOUR), NOW)).toBe("just now");
	});
});

describe("formatShortDate", () => {
	it("omits the year for the current year unless asked", () => {
		expect(formatShortDate(new Date("2026-09-22T10:00:00Z"), NOW)).toBe("22 Sep");
		expect(formatShortDate(new Date("2026-09-22T10:00:00Z"), NOW, true)).toBe("22 Sep 2026");
	});
});

describe("formatShortName", () => {
	it("shortens to first name and last initial", () => {
		expect(formatShortName("Priya Nair")).toBe("Priya N.");
		expect(formatShortName("  Marcus   van  Oort ")).toBe("Marcus O.");
	});

	it("leaves a single word alone and handles empty input", () => {
		expect(formatShortName("Tommerty")).toBe("Tommerty");
		expect(formatShortName("")).toBe("");
		expect(formatShortName(null)).toBe("");
	});
});

describe("pickLatestRelease", () => {
	it("returns the most recently released release", () => {
		const releases = [
			{ id: "a", status: "released", releasedAt: "2026-01-10T00:00:00Z" },
			{ id: "b", status: "released", releasedAt: "2026-09-22T00:00:00Z" },
			{ id: "c", status: "planned", targetDate: "2027-01-01T00:00:00Z" },
			{ id: "d", status: "archived", releasedAt: "2026-10-01T00:00:00Z" },
		];
		expect(pickLatestRelease(releases)?.id).toBe("b");
	});

	it("returns null when nothing is released", () => {
		expect(pickLatestRelease([{ id: "c", status: "planned" }])).toBeNull();
		expect(pickLatestRelease([])).toBeNull();
	});
});

describe("parseCsvParam", () => {
	it("splits, trims and de-duplicates", () => {
		expect(parseCsvParam("a, b,,a")).toEqual(["a", "b"]);
		expect(parseCsvParam(null)).toEqual([]);
		expect(parseCsvParam("")).toEqual([]);
	});
});

import { describe, expect, it } from "vitest";
import { buildDateFilterValue, fromDateInputValue, readDateRange, toDateInputValue } from "./date-value";
import { operatorHandlers } from "./filter-engine";

describe("date filter values", () => {
	it("round-trips a picked day through the stored value", () => {
		const start = fromDateInputValue("2026-03-10", "start");
		expect(toDateInputValue(start)).toBe("2026-03-10");
		expect(toDateInputValue(fromDateInputValue("2026-03-10", "end"))).toBe("2026-03-10");
		expect(fromDateInputValue("", "start")).toBe("");
		expect(toDateInputValue(undefined)).toBe("");
	});

	it("stores before as the day's start and after as its end", () => {
		expect(buildDateFilterValue("before", "", "start", "2026-03-10")).toBe(fromDateInputValue("2026-03-10", "start"));
		expect(buildDateFilterValue("after", "", "start", "2026-03-10")).toBe(fromDateInputValue("2026-03-10", "end"));
	});

	it("builds a between range one end at a time", () => {
		const withStart = buildDateFilterValue("between", "", "start", "2026-03-01");
		const range = buildDateFilterValue("between", withStart, "end", "2026-03-31");
		expect(readDateRange(range)).toEqual({
			start: fromDateInputValue("2026-03-01", "start"),
			end: fromDateInputValue("2026-03-31", "end"),
		});
	});

	it("includes the whole last day of a range", () => {
		const range = buildDateFilterValue(
			"between",
			buildDateFilterValue("between", "", "start", "2026-03-01"),
			"end",
			"2026-03-31"
		);
		const lastDayEvening = new Date(2026, 2, 31, 22, 0).toISOString();
		expect(operatorHandlers.between(lastDayEvening, range)).toBe(true);
	});
});

describe("date operators", () => {
	it("pass everything until a date is picked", () => {
		expect(operatorHandlers.before("2026-01-01", "")).toBe(true);
		expect(operatorHandlers.after(null, "")).toBe(true);
		expect(operatorHandlers.between("2026-01-01", { start: "2026-01-01", end: "" })).toBe(true);
	});

	it("exclude items without the date once one is picked", () => {
		expect(operatorHandlers.before(null, "2026-01-01")).toBe(false);
		expect(operatorHandlers.between(null, { start: "2026-01-01", end: "2026-02-01" })).toBe(false);
	});
});

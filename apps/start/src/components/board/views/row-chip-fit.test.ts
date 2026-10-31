import { describe, expect, it } from "vitest";
import { countFittingChips } from "./row-chip-fit";

const fitsFor = (widths: number[], available: number, moreWidth = 20, gap = 4) =>
	countFittingChips({ widths, available, gap, moreWidth });

describe("countFittingChips", () => {
	it("shows every chip when they all fit, without reserving the pill", () => {
		// 50 + 4 + 60 + 4 + 40 = 158
		expect(fitsFor([50, 60, 40], 158)).toBe(3);
		expect(fitsFor([50, 60, 40], 300)).toBe(3);
	});

	it("reserves the pill (and its gap) once anything is hidden", () => {
		// all = 158 > 157; 50 + 4 + 60 + 4 + 20 = 138 fits, 158 + 4 + 20 doesn't
		expect(fitsFor([50, 60, 40], 157)).toBe(2);
		expect(fitsFor([50, 60, 40], 138)).toBe(2);
		expect(fitsFor([50, 60, 40], 137)).toBe(1);
	});

	it("drops whole chips from the right down to just the pill", () => {
		// 50 + 4 + 20 = 74
		expect(fitsFor([50, 60, 40], 74)).toBe(1);
		expect(fitsFor([50, 60, 40], 73)).toBe(0);
		expect(fitsFor([50, 60, 40], 0)).toBe(0);
	});

	it("treats zero-width chips as absent (no width, no gap)", () => {
		// release renders nothing: 50 + 4 + 40 = 94
		expect(fitsFor([50, 0, 40], 94)).toBe(3);
		// 50 + 4 + 20 = 74 fits; the zero-width chip after it comes along for free
		expect(fitsFor([50, 0, 40], 93)).toBe(2);
		expect(fitsFor([0, 0, 0], 0)).toBe(3);
		expect(fitsFor([], 0)).toBe(0);
	});

	it("uses the pill width it is given", () => {
		// 50 + 4 + 30 = 84
		expect(fitsFor([50, 60], 84, 30)).toBe(1);
		expect(fitsFor([50, 60], 83, 30)).toBe(0);
	});

	it("tolerates sub-pixel rounding", () => {
		expect(fitsFor([50.3, 60.2], 114.2)).toBe(2);
	});
});

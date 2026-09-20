import { describe, expect, it } from "vitest";
import { formatTaskKey, generateSlug, getInitials, hexToHsla } from "./index";

describe("formatTaskKey", () => {
	it("formats an org short id and task short id into a task key", () => {
		expect(formatTaskKey("SAY", 123)).toBe("SAY-123");
	});

	it("falls back to a literal '?' when the task short id is missing", () => {
		expect(formatTaskKey("SAY", null)).toBe("SAY-?");
		expect(formatTaskKey("SAY", undefined)).toBe("SAY-?");
	});
});

describe("generateSlug", () => {
	it("lowercases and hyphenates a normal name", () => {
		expect(generateSlug("My Cool Project")).toBe("my-cool-project");
	});

	it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
		expect(generateSlug("Hello!!!   World??")).toBe("hello-world");
	});

	it("strips leading and trailing hyphens", () => {
		expect(generateSlug("  --Weird Name--  ")).toBe("weird-name");
	});

	it("returns an empty string for input with no alphanumeric characters", () => {
		expect(generateSlug("!!!")).toBe("");
	});
});

describe("getInitials", () => {
	it("joins the first letter of each word (capped at two), uppercased", () => {
		expect(getInitials("Tommy Lundy")).toBe("TL");
	});

	it("handles a single word", () => {
		expect(getInitials("Tommy")).toBe("T");
	});

	it("caps at two letters even with more than two words", () => {
		expect(getInitials("Tommy James Lundy")).toBe("TJ");
	});

	it("falls back to '?' for null/undefined/empty input", () => {
		expect(getInitials(null)).toBe("?");
		expect(getInitials(undefined)).toBe("?");
		expect(getInitials("")).toBe("?");
	});
});

describe("hexToHsla", () => {
	it("converts the default release blue to the web's stored hsla format", () => {
		expect(hexToHsla("#3B82F6")).toBe("hsla(217, 91%, 60%, 1)");
	});

	it("converts the primary and secondary colors", () => {
		expect(hexToHsla("#FF0000")).toBe("hsla(0, 100%, 50%, 1)");
		expect(hexToHsla("#00FF00")).toBe("hsla(120, 100%, 50%, 1)");
		expect(hexToHsla("#0000FF")).toBe("hsla(240, 100%, 50%, 1)");
		expect(hexToHsla("#FFFF00")).toBe("hsla(60, 100%, 50%, 1)");
		expect(hexToHsla("#FF00FF")).toBe("hsla(300, 100%, 50%, 1)");
	});

	it("converts greys (no hue or saturation) and the black/white extremes", () => {
		expect(hexToHsla("#000000")).toBe("hsla(0, 0%, 0%, 1)");
		expect(hexToHsla("#FFFFFF")).toBe("hsla(0, 0%, 100%, 1)");
		expect(hexToHsla("#808080")).toBe("hsla(0, 0%, 50%, 1)");
	});

	it("is case-insensitive and expands the #RGB shorthand", () => {
		expect(hexToHsla("#3b82f6")).toBe("hsla(217, 91%, 60%, 1)");
		expect(hexToHsla("#f00")).toBe("hsla(0, 100%, 50%, 1)");
	});

	it("accepts the leading # being omitted and ignores surrounding whitespace", () => {
		expect(hexToHsla("3B82F6")).toBe("hsla(217, 91%, 60%, 1)");
		expect(hexToHsla("  #3B82F6  ")).toBe("hsla(217, 91%, 60%, 1)");
	});

	it("wraps a hue that rounds up to 360 back to 0", () => {
		// #FF0001 is hue 359.76, which rounds to 360 — must render as 0, not 360.
		expect(hexToHsla("#FF0001")).toBe("hsla(0, 100%, 50%, 1)");
	});

	it("returns null for anything that isn't a hex color", () => {
		expect(hexToHsla("")).toBeNull();
		expect(hexToHsla("blue")).toBeNull();
		expect(hexToHsla("#12345")).toBeNull();
		expect(hexToHsla("#1234567")).toBeNull();
		expect(hexToHsla("#GGGGGG")).toBeNull();
		expect(hexToHsla("hsla(217, 91%, 60%, 1)")).toBeNull();
	});
});

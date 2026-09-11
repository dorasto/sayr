import { describe, expect, it } from "vitest";
import { formatTaskKey, generateSlug, getInitials } from "./index";

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

import { describe, expect, it } from "vitest";
import { linkifyTaskKeys } from "./task-keys";

describe("linkifyTaskKeys", () => {
	it("returns no segments for empty text", () => {
		expect(linkifyTaskKeys("", "SAY")).toEqual([]);
	});

	it("passes text through when there is nothing to link", () => {
		expect(linkifyTaskKeys("Plain notes", "SAY")).toEqual([{ type: "text", text: "Plain notes" }]);
		expect(linkifyTaskKeys("Plain notes (SAY-12)", "")).toEqual([{ type: "text", text: "Plain notes (SAY-12)" }]);
	});

	it("splits parenthesised keys of the org prefix into segments", () => {
		expect(linkifyTaskKeys("Follow and mute (SAY-69) plus inbox (SAY-70).", "SAY")).toEqual([
			{ type: "text", text: "Follow and mute " },
			{ type: "taskKey", key: "SAY-69", shortId: 69, raw: "(SAY-69)" },
			{ type: "text", text: " plus inbox " },
			{ type: "taskKey", key: "SAY-70", shortId: 70, raw: "(SAY-70)" },
			{ type: "text", text: "." },
		]);
	});

	it("handles a key at the very start/end and works inside markdown list items", () => {
		const segments = linkifyTaskKeys("- Fix login (SAY-1)\n- (SAY-2)", "SAY");
		expect(segments.filter((s) => s.type === "taskKey").map((s) => (s.type === "taskKey" ? s.shortId : 0))).toEqual([
			1, 2,
		]);
		expect(segments.map((s) => (s.type === "text" ? s.text : s.raw)).join("")).toBe("- Fix login (SAY-1)\n- (SAY-2)");
	});

	it("ignores other prefixes, bare keys and unparenthesised mentions", () => {
		expect(linkifyTaskKeys("See (ABC-3), SAY-4 and (say-5)", "SAY")).toEqual([
			{ type: "text", text: "See (ABC-3), SAY-4 and (say-5)" },
		]);
	});

	it("escapes regex characters in the prefix", () => {
		expect(linkifyTaskKeys("(A.B-1) (AXB-2)", "A.B")).toEqual([
			{ type: "taskKey", key: "A.B-1", shortId: 1, raw: "(A.B-1)" },
			{ type: "text", text: " (AXB-2)" },
		]);
	});
});

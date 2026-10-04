import { describe, expect, it } from "vitest";
import { mergeReleaseLists } from "./merge-releases";

describe("mergeReleaseLists", () => {
	it("concatenates lists in order", () => {
		const merged = mergeReleaseLists([[{ id: "a" }, { id: "b" }], [{ id: "c" }], [{ id: "d" }]]);
		expect(merged.map((release) => release.id)).toEqual(["a", "b", "c", "d"]);
	});

	it("dedupes by id, keeping the first occurrence", () => {
		const merged = mergeReleaseLists([
			[{ id: "a", name: "first" }],
			[
				{ id: "a", name: "second" },
				{ id: "b", name: "other" },
			],
		]);
		expect(merged).toEqual([
			{ id: "a", name: "first" },
			{ id: "b", name: "other" },
		]);
	});

	it("handles empty input", () => {
		expect(mergeReleaseLists([])).toEqual([]);
		expect(mergeReleaseLists([[], []])).toEqual([]);
	});
});

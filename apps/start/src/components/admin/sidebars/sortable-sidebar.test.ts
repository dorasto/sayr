import { describe, expect, it } from "vitest";
import { reorderIds } from "./sortable-sidebar";

describe("reorderIds", () => {
	it("moves the dragged id to the drop target's index", () => {
		expect(reorderIds(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
		expect(reorderIds(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
	});

	it("returns null when the drop changes nothing", () => {
		expect(reorderIds(["a", "b"], "a", "a")).toBeNull();
		expect(reorderIds(["a", "b"], "a", undefined)).toBeNull();
		expect(reorderIds(["a", "b"], "a", "z")).toBeNull();
	});
});

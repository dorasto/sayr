import { describe, expect, it, vi } from "vitest";
import { deserializeFilters, serializeFilters } from "./serialization";
import type { FilterState } from "./types";

/** Encodes raw `[field, op, value]` tuples the way serializeFilters does, so legacy operators can be fed in. */
function encodeRaw(groups: [string, string, unknown][][]): string {
	const json = JSON.stringify(groups);
	const binary = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, hex) =>
		String.fromCharCode(Number.parseInt(hex, 16))
	);
	return encodeURIComponent(btoa(binary));
}

function conditionsOf(state: FilterState | null) {
	return state?.groups.flatMap((group) =>
		group.conditions.map(({ field, operator, value }) => ({ field, operator, value }))
	);
}

describe("deserializeFilters", () => {
	it("round-trips what serializeFilters writes", () => {
		const state: FilterState = {
			operator: "AND",
			groups: [
				{
					id: "g",
					operator: "AND",
					conditions: [
						{ id: "a", field: "status", operator: "any", value: ["todo", "done"] },
						{ id: "b", field: "title", operator: "contains", value: "Ünïcode" },
					],
				},
			],
		};
		expect(conditionsOf(deserializeFilters(serializeFilters(state)))).toEqual([
			{ field: "status", operator: "any", value: ["todo", "done"] },
			{ field: "title", operator: "contains", value: "Ünïcode" },
		]);
	});

	it("maps the legacy `is` / `is_not` operators to `any` / `none`", () => {
		const encoded = encodeRaw([
			[
				["label", "is", ["l1"]],
				["category", "is_not", ["c1"]],
				["priority", "all", ["high"]],
			],
		]);
		expect(conditionsOf(deserializeFilters(encoded))).toEqual([
			{ field: "label", operator: "any", value: ["l1"] },
			{ field: "category", operator: "none", value: ["c1"] },
			{ field: "priority", operator: "all", value: ["high"] },
		]);
	});

	it("returns null for empty or malformed input", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		expect(deserializeFilters("")).toBeNull();
		expect(deserializeFilters("not-base64-json")).toBeNull();
		consoleError.mockRestore();
	});
});

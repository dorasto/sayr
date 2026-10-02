import { describe, expect, it } from "vitest";
import { getBoardStateKind, resolveBoardState } from "./renderers";

const idle = { isLoading: false, isError: false };

describe("getBoardStateKind", () => {
	it("is never a state while there are items to show", () => {
		expect(getBoardStateKind({ isLoading: true, isError: false }, 3)).toBeNull();
		expect(getBoardStateKind({ isLoading: false, isError: true }, 1)).toBeNull();
		expect(getBoardStateKind(undefined, 5)).toBeNull();
	});

	it("is loading, then error, then empty when there is nothing to show", () => {
		expect(getBoardStateKind({ isLoading: true, isError: true }, 0)).toBe("loading");
		expect(getBoardStateKind({ isLoading: false, isError: true }, 0)).toBe("error");
		expect(getBoardStateKind(idle, 0)).toBe("empty");
	});

	it("treats a data source without status as empty, never loading or errored", () => {
		expect(getBoardStateKind(undefined, 0)).toBe("empty");
	});
});

describe("resolveBoardState", () => {
	const states = { loading: "L", error: "E", empty: "M" };

	it("returns undefined (render the views) while there are items", () => {
		expect(resolveBoardState({ isLoading: true, isError: false }, 2, states)).toBeUndefined();
	});

	it("returns the matching slot", () => {
		expect(resolveBoardState({ isLoading: true, isError: false }, 0, states)).toBe("L");
		expect(resolveBoardState({ isLoading: false, isError: true }, 0, states)).toBe("E");
		expect(resolveBoardState(idle, 0, states)).toBe("M");
	});

	it("renders nothing (null) for loading without a slot", () => {
		expect(resolveBoardState({ isLoading: true, isError: false }, 0, undefined)).toBeNull();
		expect(resolveBoardState({ isLoading: true, isError: false }, 0, { error: "E" })).toBeNull();
	});

	it("falls through to the views (undefined) for error/empty without a slot", () => {
		expect(resolveBoardState({ isLoading: false, isError: true }, 0, undefined)).toBeUndefined();
		expect(resolveBoardState(undefined, 0, undefined)).toBeUndefined();
		expect(resolveBoardState(idle, 0, { loading: "L" })).toBeUndefined();
	});
});

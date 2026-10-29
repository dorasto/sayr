import { describe, expect, it } from "vitest";
import { isViewSlugTaken, normalizeViewSlugInput, resolveSlugUpdate } from "./view-settings-model";

describe("normalizeViewSlugInput", () => {
	it("lowercases, hyphenates spaces and drops other characters", () => {
		expect(normalizeViewSlugInput("My Open Bugs!")).toBe("my-open-bugs");
	});

	it("collapses runs of hyphens", () => {
		expect(normalizeViewSlugInput("a -- b")).toBe("a-b");
	});

	it("keeps a trailing hyphen (or a just-typed space) while typing", () => {
		expect(normalizeViewSlugInput("my-")).toBe("my-");
		expect(normalizeViewSlugInput("my ")).toBe("my-");
	});

	it("doesn't add any prefix", () => {
		expect(normalizeViewSlugInput("todo-view-test")).toBe("todo-view-test");
	});
});

describe("resolveSlugUpdate", () => {
	it("returns the new slug when it changed", () => {
		expect(resolveSlugUpdate("open-bugs", "todo-view-test")).toBe("open-bugs");
	});

	it("returns undefined when unchanged", () => {
		expect(resolveSlugUpdate("todo-view-test", "todo-view-test")).toBeUndefined();
	});

	it("returns undefined for an empty field (a slug can't be cleared)", () => {
		expect(resolveSlugUpdate("", "todo-view-test")).toBeUndefined();
		expect(resolveSlugUpdate("---", "todo-view-test")).toBeUndefined();
		expect(resolveSlugUpdate("", null)).toBeUndefined();
	});

	it("trims leading and trailing hyphens", () => {
		expect(resolveSlugUpdate("-open-bugs-", null)).toBe("open-bugs");
	});

	it("sets a first slug on a view that had none", () => {
		expect(resolveSlugUpdate("my-view", null)).toBe("my-view");
	});
});

describe("isViewSlugTaken", () => {
	const views = [
		{ id: "1", slug: "alpha" },
		{ id: "2", slug: null },
		{ id: "3", slug: "gamma" },
	];

	it("is true when another view has the slug", () => {
		expect(isViewSlugTaken("alpha", views, "3")).toBe(true);
	});

	it("is true when another view is addressed by that id", () => {
		expect(isViewSlugTaken("2", views, "3")).toBe(true);
	});

	it("ignores the view being edited", () => {
		expect(isViewSlugTaken("gamma", views, "3")).toBe(false);
	});

	it("is false for a free slug", () => {
		expect(isViewSlugTaken("delta", views, "3")).toBe(false);
	});
});

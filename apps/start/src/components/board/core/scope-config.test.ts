import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_VIEW_STATE } from "../filter/types";
import {
	type BoardScope,
	deriveViewStateCacheKey,
	isControlledPersistence,
	LEGACY_BOARD_SCOPE,
	resolveInitialState,
	resolvePersistence,
	syncsUrl,
	usesPersonalViews,
} from "./scope-config";
import { DEFAULT_COMBINED_STATE, DEFAULT_FILTER_STATE } from "./view-config";

describe("deriveViewStateCacheKey", () => {
	it("maps the home scope to the legacy global key", () => {
		expect(deriveViewStateCacheKey("home")).toBe("board-view-combined");
	});

	it("namespaces every other scope", () => {
		expect(deriveViewStateCacheKey("public-feedback")).toBe("board-view-combined:public-feedback");
	});
});

describe("legacy scope", () => {
	it("is today's behaviour: home key, url+personal", () => {
		expect(LEGACY_BOARD_SCOPE.key).toBe("home");
		expect(LEGACY_BOARD_SCOPE.persistence).toBe("url+personal");
		expect(LEGACY_BOARD_SCOPE.initial).toBeUndefined();
		expect(deriveViewStateCacheKey(LEGACY_BOARD_SCOPE.key)).toBe("board-view-combined");
	});
});

describe("persistence predicates", () => {
	it("syncsUrl is true for url+personal and url only", () => {
		expect(syncsUrl("url+personal")).toBe(true);
		expect(syncsUrl("url")).toBe(true);
		expect(syncsUrl("memory")).toBe(false);
		expect(syncsUrl("controlled")).toBe(false);
	});

	it("usesPersonalViews is true for url+personal only", () => {
		expect(usesPersonalViews("url+personal")).toBe(true);
		expect(usesPersonalViews("url")).toBe(false);
		expect(usesPersonalViews("memory")).toBe(false);
		expect(usesPersonalViews("controlled")).toBe(false);
	});

	it("isControlledPersistence is true for controlled only", () => {
		expect(isControlledPersistence("controlled")).toBe(true);
		expect(isControlledPersistence("memory")).toBe(false);
	});
});

describe("resolvePersistence", () => {
	it("keeps the declared persistence", () => {
		expect(resolvePersistence({ key: "k", persistence: "url" })).toBe("url");
	});

	it("degrades controlled without a handle to memory", () => {
		expect(resolvePersistence({ key: "k", persistence: "controlled" })).toBe("memory");
	});

	it("keeps controlled when a handle is given", () => {
		const scope: BoardScope = {
			key: "k",
			persistence: "controlled",
			controlled: { state: DEFAULT_COMBINED_STATE, onChange: () => undefined },
		};
		expect(resolvePersistence(scope)).toBe("controlled");
	});
});

describe("resolveInitialState", () => {
	it("returns the shared default for no initial state", () => {
		expect(resolveInitialState(undefined)).toBe(DEFAULT_COMBINED_STATE);
	});

	it("merges a partial view config over the defaults", () => {
		const state = resolveInitialState({ showCompletedTasks: true, sortBy: "none" });
		expect(state.filters).toBe(DEFAULT_FILTER_STATE);
		expect(state.viewConfig).toEqual({ ...DEFAULT_TASK_VIEW_STATE, showCompletedTasks: true, sortBy: "none" });
	});

	it("takes initial filters out of the view config", () => {
		const filters = {
			operator: "OR" as const,
			groups: [],
		};
		const state = resolveInitialState({ filters, viewMode: "card" });
		expect(state.filters).toBe(filters);
		expect(state.viewConfig.viewMode).toBe("card");
		expect("filters" in state.viewConfig).toBe(false);
	});
});

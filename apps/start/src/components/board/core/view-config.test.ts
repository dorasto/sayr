import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_VIEW_STATE, type TaskViewState } from "../filter/types";
import {
	areStatesEqual,
	areViewConfigsEqual,
	coerceToLegacyViewMode,
	DEFAULT_COMBINED_STATE,
	getViewCombinedState,
	mapStateToViewConfig,
	mapViewConfigToState,
	resolveViewMode,
} from "./view-config";

type ViewConfig = NonNullable<schema.savedViewType["viewConfig"]>;

const BASE_CONFIG: ViewConfig = {
	mode: "kanban",
	groupBy: "priority",
	subGroupBy: "assignee",
	showCompletedTasks: true,
	sortBy: "voteCount",
	sortDirection: "desc",
};

describe("resolveViewMode", () => {
	it("passes persisted modes through", () => {
		expect(resolveViewMode("list")).toBe("list");
		expect(resolveViewMode("kanban")).toBe("kanban");
		expect(resolveViewMode("card")).toBe("card");
	});

	it("falls back to list for unknown or missing modes", () => {
		expect(resolveViewMode(undefined)).toBe("list");
		expect(resolveViewMode("")).toBe("list");
		expect(resolveViewMode("gantt")).toBe("list");
	});

	it("with available ids, only accepts those", () => {
		expect(resolveViewMode("card", ["card", "list"])).toBe("card");
		expect(resolveViewMode("kanban", ["card", "list"])).toBe("list");
		expect(resolveViewMode(undefined, ["card", "list"])).toBe("list");
	});

	it("with available ids lacking list, falls back to the first one", () => {
		expect(resolveViewMode("list", ["card"])).toBe("card");
		expect(resolveViewMode("nope", ["roadmap", "card"])).toBe("roadmap");
	});

	it("with no available ids at all, falls back to list", () => {
		expect(resolveViewMode("card", [])).toBe("list");
	});
});

describe("coerceToLegacyViewMode", () => {
	it("keeps list and kanban, coerces card and unknown to list", () => {
		expect(coerceToLegacyViewMode("kanban")).toBe("kanban");
		expect(coerceToLegacyViewMode("list")).toBe("list");
		expect(coerceToLegacyViewMode("card")).toBe("list");
		expect(coerceToLegacyViewMode(undefined)).toBe("list");
	});
});

describe("mapViewConfigToState", () => {
	it("maps every field", () => {
		expect(mapViewConfigToState(BASE_CONFIG)).toEqual({
			grouping: "priority",
			subGrouping: "assignee",
			showCompletedTasks: true,
			viewMode: "kanban",
			sortBy: "voteCount",
			sortDirection: "desc",
		});
	});

	it("defaults optional fields", () => {
		const state = mapViewConfigToState({ mode: "list", groupBy: "status", showCompletedTasks: false });
		expect(state.subGrouping).toBe("none");
		expect(state.sortBy).toBe("none");
		expect(state.sortDirection).toBe("asc");
	});

	it("keeps card as a persisted mode", () => {
		expect(mapViewConfigToState({ ...BASE_CONFIG, mode: "card" }).viewMode).toBe("card");
	});

	it("maps an unknown stored mode to list", () => {
		const legacy = { ...BASE_CONFIG, mode: "timeline" } as unknown as ViewConfig;
		expect(mapViewConfigToState(legacy).viewMode).toBe("list");
	});
});

describe("mapStateToViewConfig", () => {
	const iconColor = { icon: "IconStack2", color: "#fff" };

	it("is the inverse of mapViewConfigToState for the view fields", () => {
		const state = mapViewConfigToState(BASE_CONFIG);
		expect(mapStateToViewConfig(state, iconColor)).toEqual({ ...BASE_CONFIG, ...iconColor });
	});

	it("persists card", () => {
		const state: TaskViewState = { ...DEFAULT_TASK_VIEW_STATE, viewMode: "card" };
		expect(mapStateToViewConfig(state, iconColor).mode).toBe("card");
	});
});

describe("areViewConfigsEqual", () => {
	it("is equal for identical configs and treats missing sort as none/asc", () => {
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE })).toBe(true);
		expect(
			areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, {
				...DEFAULT_TASK_VIEW_STATE,
				sortBy: undefined,
				sortDirection: undefined,
			})
		).toBe(true);
	});

	it("differs on view mode, including card", () => {
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, viewMode: "kanban" })).toBe(
			false
		);
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, viewMode: "card" })).toBe(
			false
		);
	});

	it("differs on grouping, sub-grouping, completed and sort", () => {
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, grouping: "priority" })).toBe(
			false
		);
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, subGrouping: "status" })).toBe(
			false
		);
		expect(
			areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, showCompletedTasks: true })
		).toBe(false);
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, sortBy: "priority" })).toBe(
			false
		);
		expect(areViewConfigsEqual(DEFAULT_TASK_VIEW_STATE, { ...DEFAULT_TASK_VIEW_STATE, sortDirection: "desc" })).toBe(
			false
		);
	});
});

describe("areStatesEqual", () => {
	it("compares filters and view config", () => {
		expect(areStatesEqual(DEFAULT_COMBINED_STATE, { ...DEFAULT_COMBINED_STATE })).toBe(true);
		expect(
			areStatesEqual(DEFAULT_COMBINED_STATE, {
				...DEFAULT_COMBINED_STATE,
				viewConfig: { ...DEFAULT_TASK_VIEW_STATE, viewMode: "card" },
			})
		).toBe(false);
		expect(
			areStatesEqual(DEFAULT_COMBINED_STATE, {
				...DEFAULT_COMBINED_STATE,
				filters: {
					operator: "AND",
					groups: [
						{
							id: "g",
							operator: "AND",
							conditions: [{ id: "c", field: "status", operator: "any", value: ["done"] }],
						},
					],
				},
			})
		).toBe(false);
	});
});

describe("getViewCombinedState", () => {
	const baseRow = { filterParams: "", viewConfig: BASE_CONFIG } as schema.savedViewType;

	it("combines the view's filters and mapped config", () => {
		const state = getViewCombinedState(baseRow);
		expect(state.viewConfig.viewMode).toBe("kanban");
		expect(state.filters.groups).toEqual([]);
	});

	it("falls back to the default view state when the row has no config", () => {
		expect(getViewCombinedState({ ...baseRow, viewConfig: null }).viewConfig).toEqual(DEFAULT_TASK_VIEW_STATE);
	});
});

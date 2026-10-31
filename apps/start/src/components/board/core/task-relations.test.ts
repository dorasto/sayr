import { describe, expect, it } from "vitest";
import { getEligibleParentTasks, getRelationTargetTasks, matchesTaskSearch } from "./task-relations";

const task = (
	id: string,
	extra: { organizationId?: string; parentId?: string | null; subtaskCount?: number } = {}
) => ({
	id,
	organizationId: extra.organizationId ?? "org-a",
	parentId: extra.parentId ?? null,
	subtaskCount: extra.subtaskCount,
});

describe("getEligibleParentTasks", () => {
	it("offers other top-level tasks without subtasks in the same org", () => {
		const self = task("self");
		const tasks = [
			self,
			task("ok"),
			task("other-org", { organizationId: "org-b" }),
			task("is-subtask", { parentId: "ok" }),
			task("has-subtasks", { subtaskCount: 2 }),
			task("zero-subtasks", { subtaskCount: 0 }),
		];
		expect(getEligibleParentTasks(self, tasks).map((t) => t.id)).toEqual(["ok", "zero-subtasks"]);
	});

	it("keeps the task's current parent even though it has subtasks", () => {
		const self = task("self", { parentId: "parent" });
		const tasks = [self, task("parent", { subtaskCount: 1 }), task("busy", { subtaskCount: 3 })];
		expect(getEligibleParentTasks(self, tasks).map((t) => t.id)).toEqual(["parent"]);
	});
});

describe("getRelationTargetTasks", () => {
	it("offers every other task in the same org", () => {
		const self = task("self");
		const tasks = [self, task("a", { parentId: "x" }), task("b", { organizationId: "org-b" }), task("c")];
		expect(getRelationTargetTasks(self, tasks).map((t) => t.id)).toEqual(["a", "c"]);
	});
});

describe("matchesTaskSearch", () => {
	const item = { title: "Fix the Login page", shortId: 42 };

	it("matches everything for an empty query", () => {
		expect(matchesTaskSearch(item, "SAY-42", "  ")).toBe(true);
	});

	it("matches the key, the title and the bare number, case-insensitively", () => {
		expect(matchesTaskSearch(item, "SAY-42", "say-42")).toBe(true);
		expect(matchesTaskSearch(item, "SAY-42", "login")).toBe(true);
		expect(matchesTaskSearch(item, "SAY-42", "42")).toBe(true);
		expect(matchesTaskSearch(item, "SAY-42", "logout")).toBe(false);
	});

	it("copes with a task with no title", () => {
		expect(matchesTaskSearch({ title: null, shortId: 1 }, "SAY-1", "say")).toBe(true);
	});
});

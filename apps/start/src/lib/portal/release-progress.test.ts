import { describe, expect, it } from "vitest";
import { getReleaseProgress } from "./release-progress";

const label = (id: string, name = id) => ({ id, name, color: "#fff" });

describe("getReleaseProgress", () => {
	it("returns zeros for an empty or missing list", () => {
		expect(getReleaseProgress([])).toEqual({
			total: 0,
			done: 0,
			inProgress: 0,
			planned: 0,
			percent: 0,
			labelCounts: [],
		});
		expect(getReleaseProgress(undefined).percent).toBe(0);
	});

	it("counts done / in-progress / planned and rounds the percentage", () => {
		const tasks = [
			...Array.from({ length: 4 }, () => ({ status: "done" })),
			...Array.from({ length: 2 }, () => ({ status: "in-progress" })),
			{ status: "todo" },
			{ status: "backlog" },
			{ status: "todo" },
		];
		const progress = getReleaseProgress(tasks);
		expect(progress).toMatchObject({ total: 9, done: 4, inProgress: 2, planned: 3, percent: 44 });
	});

	it("ignores canceled tasks entirely", () => {
		const progress = getReleaseProgress([{ status: "done" }, { status: "canceled", labels: [label("x")] }]);
		expect(progress).toMatchObject({ total: 1, done: 1, percent: 100, labelCounts: [] });
	});

	it("counts labels in descending order with their share of the total", () => {
		const progress = getReleaseProgress([
			{ status: "done", labels: [label("b", "Backend"), label("i", "Improvement")] },
			{ status: "done", labels: [label("b", "Backend")] },
			{ status: "todo", labels: [label("a", "AI Feature")] },
			{ status: "todo", labels: [label("i", "Improvement")] },
			{ status: "todo", labels: [label("b", "Backend")] },
		]);
		expect(progress.labelCounts.map((l) => [l.id, l.count])).toEqual([
			["b", 3],
			["i", 2],
			["a", 1],
		]);
		expect(progress.labelCounts[0]?.share).toBeCloseTo(0.6);
	});
});

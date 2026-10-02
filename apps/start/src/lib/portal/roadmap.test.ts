import { describe, expect, it } from "vitest";
import {
	buildReleaseColumns,
	buildStatusColumns,
	countBacklog,
	isRecentlyShipped,
	type RoadmapRelease,
	type RoadmapTask,
	ROADMAP_RECENT_DAYS,
	UNSCHEDULED_COLUMN_KEY,
} from "./roadmap";

const NOW = new Date("2026-06-30T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const task = (id: string, overrides: Partial<RoadmapTask> = {}): RoadmapTask => ({
	id,
	status: "todo",
	voteCount: 0,
	createdAt: "2026-01-01T00:00:00Z",
	releaseId: null,
	...overrides,
});

const release = (id: string, overrides: Partial<RoadmapRelease> = {}): RoadmapRelease => ({
	id,
	name: id,
	status: "released",
	...overrides,
});

const byId = (...releases: RoadmapRelease[]) => new Map(releases.map((r) => [r.id, r]));

describe("isRecentlyShipped", () => {
	const released = release("r1", { releasedAt: daysAgo(10) });

	it("accepts a done post whose release shipped inside the window", () => {
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, released, NOW)).toBe(true);
	});

	it("rejects done posts without a release", () => {
		expect(isRecentlyShipped({ status: "done", releaseId: null }, released, NOW)).toBe(false);
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, undefined, NOW)).toBe(false);
	});

	it("rejects posts that are not done", () => {
		expect(isRecentlyShipped({ status: "in-progress", releaseId: "r1" }, released, NOW)).toBe(false);
		expect(isRecentlyShipped({ status: "canceled", releaseId: "r1" }, released, NOW)).toBe(false);
	});

	it("requires the release to be released", () => {
		for (const status of ["planned", "in-progress", "archived"]) {
			const other = release("r1", { status, releasedAt: daysAgo(10), targetDate: daysAgo(10) });
			expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, other, NOW)).toBe(false);
		}
	});

	it("applies a 90 day window to releasedAt, falling back to targetDate", () => {
		expect(ROADMAP_RECENT_DAYS).toBe(90);
		const inside = release("r1", { releasedAt: daysAgo(89) });
		const outside = release("r1", { releasedAt: daysAgo(91) });
		const targetOnly = release("r1", { releasedAt: null, targetDate: daysAgo(30) });
		const targetOld = release("r1", { releasedAt: undefined, targetDate: daysAgo(200) });
		const noDates = release("r1", { createdAt: daysAgo(1) });
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, inside, NOW)).toBe(true);
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, outside, NOW)).toBe(false);
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, targetOnly, NOW)).toBe(true);
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, targetOld, NOW)).toBe(false);
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, noDates, NOW)).toBe(false);
	});

	it("prefers releasedAt over targetDate", () => {
		const shippedLate = release("r1", { releasedAt: daysAgo(5), targetDate: daysAgo(300) });
		expect(isRecentlyShipped({ status: "done", releaseId: "r1" }, shippedLate, NOW)).toBe(true);
	});
});

describe("buildStatusColumns", () => {
	const releases = byId(
		release("new", { releasedAt: daysAgo(5) }),
		release("old", { releasedAt: daysAgo(40) }),
		release("ancient", { releasedAt: daysAgo(400) })
	);

	const tasks = [
		task("backlog", { status: "backlog", voteCount: 99 }),
		task("canceled", { status: "canceled", voteCount: 99 }),
		task("plan-low", { status: "todo", voteCount: 1 }),
		task("plan-high", { status: "todo", voteCount: 7 }),
		task("prog", { status: "in-progress", voteCount: 3 }),
		task("done-old", { status: "done", releaseId: "old", voteCount: 50 }),
		task("done-new", { status: "done", releaseId: "new", voteCount: 1 }),
		task("done-ancient", { status: "done", releaseId: "ancient" }),
		task("done-none", { status: "done", releaseId: null }),
	];

	it("assigns tasks to the three columns and drops the rest", () => {
		const columns = buildStatusColumns(tasks, releases, NOW);
		expect(columns.planned.map((t) => t.id)).toEqual(["plan-high", "plan-low"]);
		expect(columns.inProgress.map((t) => t.id)).toEqual(["prog"]);
		expect(columns.done.map((t) => t.id)).toEqual(["done-new", "done-old"]);
	});

	it("returns empty columns for an empty list", () => {
		expect(buildStatusColumns([], releases, NOW)).toEqual({ planned: [], inProgress: [], done: [] });
	});
});

describe("buildReleaseColumns", () => {
	const releases = byId(
		release("later", { status: "planned", targetDate: "2026-09-01T00:00:00Z" }),
		release("soon", { status: "in-progress", targetDate: "2026-07-15T00:00:00Z" }),
		release("undated", { status: "planned" }),
		release("shipped", { status: "released", releasedAt: daysAgo(3) })
	);

	it("groups by upcoming release in target-date order, then Unscheduled", () => {
		const tasks = [
			task("a", { status: "todo", releaseId: "later", voteCount: 1 }),
			task("b", { status: "in-progress", releaseId: "soon", voteCount: 2 }),
			task("c", { status: "todo", releaseId: "soon", voteCount: 5 }),
			task("d", { status: "todo", releaseId: "undated" }),
			task("e", { status: "todo", releaseId: null }),
			task("f", { status: "todo", releaseId: "shipped" }),
			task("g", { status: "backlog", releaseId: "soon" }),
			task("h", { status: "done", releaseId: "soon" }),
		];
		const columns = buildReleaseColumns(tasks, releases);
		expect(columns.map((column) => column.key)).toEqual(["soon", "later", "undated", UNSCHEDULED_COLUMN_KEY]);
		expect(columns[0]?.tasks.map((t) => t.id)).toEqual(["c", "b"]);
		expect(columns[3]?.release).toBeNull();
		expect(columns[3]?.tasks.map((t) => t.id).sort()).toEqual(["e", "f"]);
	});

	it("omits Unscheduled and empty releases when there is nothing to put in them", () => {
		const columns = buildReleaseColumns([task("a", { status: "todo", releaseId: "later" })], releases);
		expect(columns.map((column) => column.key)).toEqual(["later"]);
		expect(buildReleaseColumns([], releases)).toEqual([]);
	});
});

describe("countBacklog", () => {
	const tasks = [
		task("a", { status: "backlog" }),
		task("b", { status: "backlog" }),
		task("c", { status: "todo" }),
		task("d", { status: "done" }),
	];

	it("counts backlog posts once everything is loaded", () => {
		expect(countBacklog(tasks, true)).toBe(2);
		expect(countBacklog([], true)).toBe(0);
	});

	it("returns null when the loaded set is incomplete", () => {
		expect(countBacklog(tasks, false)).toBeNull();
	});
});

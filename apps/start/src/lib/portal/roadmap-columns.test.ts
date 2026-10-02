import { describe, expect, it } from "vitest";
import type { RoadmapRelease, RoadmapTask } from "./roadmap";
import {
	describeReleaseColumn,
	isUnscheduledColumnId,
	ROADMAP_UNSCHEDULED_COLUMN_ID,
	toBoardColumns,
} from "./roadmap-columns";

const NOW = new Date("2026-06-30T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const daysAhead = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();

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

describe("toBoardColumns (status)", () => {
	it("returns Planned, In progress and Done in order, keyed by task status", () => {
		const columns = toBoardColumns("status", [], byId(), NOW);
		expect(columns.map((column) => column.id)).toEqual(["todo", "in-progress", "done"]);
		expect(columns.map((column) => column.label)).toEqual(["Planned", "In progress", "Done"]);
	});

	it("keeps empty columns, each with an empty message", () => {
		const columns = toBoardColumns("status", [], byId(), NOW);
		for (const column of columns) {
			expect(column.items).toEqual([]);
			expect(column.emptyMessage).toBeTruthy();
		}
	});

	it("buckets todo and in-progress posts and drops backlog and canceled ones", () => {
		const columns = toBoardColumns(
			"status",
			[
				task("a", { status: "todo" }),
				task("b", { status: "in-progress" }),
				task("c", { status: "backlog" }),
				task("d", { status: "canceled" }),
			],
			byId(),
			NOW
		);
		expect(columns[0]?.items.map((item) => item.id)).toEqual(["a"]);
		expect(columns[1]?.items.map((item) => item.id)).toEqual(["b"]);
		expect(columns[2]?.items).toEqual([]);
	});

	it("applies the 90-day rule to Done relative to the injected now", () => {
		const inside = release("inside", { releasedAt: daysAgo(89) });
		const outside = release("outside", { releasedAt: daysAgo(91) });
		const tasks = [
			task("in", { status: "done", releaseId: "inside" }),
			task("out", { status: "done", releaseId: "outside" }),
			task("no-release", { status: "done" }),
		];
		const columns = toBoardColumns("status", tasks, byId(inside, outside), NOW);
		expect(columns[2]?.items.map((item) => item.id)).toEqual(["in"]);

		// Same data viewed 10 days earlier: the 91-day-old release is now inside the window.
		const earlier = new Date(NOW.getTime() - 10 * DAY);
		const earlierColumns = toBoardColumns("status", tasks, byId(inside, outside), earlier);
		expect(earlierColumns[2]?.items.map((item) => item.id).sort()).toEqual(["in", "out"]);
	});

	it("orders planned posts most voted first", () => {
		const columns = toBoardColumns(
			"status",
			[task("low", { voteCount: 1 }), task("high", { voteCount: 9 })],
			byId(),
			NOW
		);
		expect(columns[0]?.items.map((item) => item.id)).toEqual(["high", "low"]);
	});
});

describe("toBoardColumns (release)", () => {
	it("returns one column per upcoming release, earliest target first, then Unscheduled", () => {
		const later = release("later", { status: "planned", name: "Later", targetDate: daysAhead(60) });
		const sooner = release("sooner", { status: "in-progress", name: "Sooner", targetDate: daysAhead(10) });
		const columns = toBoardColumns(
			"release",
			[
				task("a", { releaseId: "later" }),
				task("b", { releaseId: "sooner", status: "in-progress" }),
				task("c", { releaseId: null }),
			],
			byId(later, sooner),
			NOW
		);
		expect(columns.map((column) => column.id)).toEqual(["sooner", "later", ROADMAP_UNSCHEDULED_COLUMN_ID]);
		expect(columns.map((column) => column.label)).toEqual(["Sooner", "Later", "Unscheduled"]);
		expect(columns[2]?.items.map((item) => item.id)).toEqual(["c"]);
	});

	it("falls back to one empty Unscheduled column when there is nothing to show", () => {
		const columns = toBoardColumns("release", [task("done", { status: "done" })], byId(), NOW);
		expect(columns).toHaveLength(1);
		expect(columns[0]).toMatchObject({
			id: ROADMAP_UNSCHEDULED_COLUMN_ID,
			label: "Unscheduled",
			items: [],
			emptyMessage: "Nothing planned or in progress yet",
		});
	});

	it("treats a post on a released release as unscheduled", () => {
		const shipped = release("shipped", { releasedAt: daysAgo(5) });
		const columns = toBoardColumns("release", [task("a", { releaseId: "shipped" })], byId(shipped), NOW);
		expect(columns.map((column) => column.id)).toEqual([ROADMAP_UNSCHEDULED_COLUMN_ID]);
		expect(columns[0]?.items.map((item) => item.id)).toEqual(["a"]);
	});
});

describe("describeReleaseColumn", () => {
	it("describes the unscheduled bucket", () => {
		expect(describeReleaseColumn(null, NOW)).toBe("Not attached to an upcoming release");
	});

	it("shows the status and target date", () => {
		expect(describeReleaseColumn({ status: "in-progress", targetDate: "2026-07-14T00:00:00Z" }, NOW)).toMatch(
			/^In progress · target \d{1,2} Jul$/
		);
		expect(describeReleaseColumn({ status: "planned" }, NOW)).toBe("Planned · no target date");
	});
});

describe("isUnscheduledColumnId", () => {
	it("matches only the unscheduled column", () => {
		expect(isUnscheduledColumnId(ROADMAP_UNSCHEDULED_COLUMN_ID)).toBe(true);
		expect(isUnscheduledColumnId("some-release-id")).toBe(false);
	});
});

import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import { applyReleaseTaskEvent, readReleasesEvent, upsertReleaseRow } from "./release-page-event";

const RELEASE_ID = "rel-1";

function makeRelease(overrides: Partial<schema.releaseType> = {}): schema.releaseType {
	return {
		id: RELEASE_ID,
		organizationId: "org-a",
		name: "Board consolidation",
		slug: "0.8.0",
		description: null,
		status: "planned",
		targetDate: null,
		releasedAt: null,
		color: null,
		icon: null,
		leadId: null,
		createdBy: null,
		createdAt: new Date(0),
		updatedAt: new Date(0),
		...overrides,
	};
}

function makeTask(
	overrides: Partial<schema.TaskWithLabels> & Pick<schema.TaskWithLabels, "id">
): schema.TaskWithLabels {
	return {
		organizationId: "org-a",
		shortId: 1,
		visible: "public",
		createdAt: new Date(0),
		updatedAt: new Date(0),
		title: "Task",
		description: { type: "doc" },
		status: "todo",
		priority: "none",
		category: null,
		releaseId: RELEASE_ID,
		voteCount: 0,
		parentId: null,
		aiSummaryHash: null,
		aiSummaryGeneratedAt: null,
		embedding: null,
		labels: [],
		assignees: [],
		...overrides,
	};
}

describe("readReleasesEvent", () => {
	const noTasks = new Set<string>();

	it("returns this release's row when the row itself is broadcast", () => {
		const row = makeRelease({ name: "Renamed" });
		expect(readReleasesEvent(row, RELEASE_ID, noTasks)).toEqual({ kind: "release", release: row });
	});

	it("ignores another release's row", () => {
		expect(readReleasesEvent(makeRelease({ id: "rel-2" }), RELEASE_ID, noTasks)).toEqual({ kind: "none" });
	});

	it("still reads a legacy array of rows", () => {
		const row = makeRelease({ name: "From array" });
		expect(readReleasesEvent([makeRelease({ id: "rel-2" }), row], RELEASE_ID, noTasks)).toEqual({
			kind: "release",
			release: row,
		});
	});

	it("refetches when a task moves into this release", () => {
		expect(readReleasesEvent({ taskId: "t-9", releaseId: RELEASE_ID }, RELEASE_ID, noTasks)).toEqual({
			kind: "refetch",
		});
	});

	it("refetches when one of its tasks moves out", () => {
		expect(readReleasesEvent({ taskId: "t-1", releaseId: null }, RELEASE_ID, new Set(["t-1"]))).toEqual({
			kind: "refetch",
		});
	});

	it("ignores a move between two other releases", () => {
		expect(readReleasesEvent({ taskId: "t-9", releaseId: "rel-2" }, RELEASE_ID, new Set(["t-1"]))).toEqual({
			kind: "none",
		});
	});

	it("refetches on { releaseId } for this release (labels / pull requests)", () => {
		expect(readReleasesEvent({ releaseId: RELEASE_ID }, RELEASE_ID, noTasks)).toEqual({ kind: "refetch" });
		expect(readReleasesEvent({ releaseId: "rel-2" }, RELEASE_ID, noTasks)).toEqual({ kind: "none" });
	});

	it("ignores anything unrecognised", () => {
		expect(readReleasesEvent(null, RELEASE_ID, noTasks)).toEqual({ kind: "none" });
		expect(readReleasesEvent("nope", RELEASE_ID, noTasks)).toEqual({ kind: "none" });
	});
});

describe("applyReleaseTaskEvent", () => {
	const t1 = makeTask({ id: "t-1" });
	const t2 = makeTask({ id: "t-2" });

	it("appends a task that joined this release", () => {
		const incoming = makeTask({ id: "t-3" });
		expect(applyReleaseTaskEvent([t1], incoming, RELEASE_ID)).toEqual([t1, incoming]);
	});

	it("replaces an updated task in place", () => {
		const updated = makeTask({ id: "t-1", title: "Renamed" });
		expect(applyReleaseTaskEvent([t1, t2], updated, RELEASE_ID)).toEqual([updated, t2]);
	});

	it("removes a task that left this release", () => {
		const moved = makeTask({ id: "t-1", releaseId: "rel-2" });
		expect(applyReleaseTaskEvent([t1, t2], moved, RELEASE_ID)).toEqual([t2]);
	});

	it("returns the same array for a task unrelated to this release", () => {
		const tasks = [t1];
		expect(applyReleaseTaskEvent(tasks, makeTask({ id: "t-9", releaseId: "rel-2" }), RELEASE_ID)).toBe(tasks);
	});

	it("marks publish-closed tasks done", () => {
		const result = applyReleaseTaskEvent([t1, t2], { taskIds: ["t-2"], status: "done" }, RELEASE_ID);
		expect(result.map((task) => task.status)).toEqual(["todo", "done"]);
	});

	it("returns the same array when no listed task is on the page", () => {
		const tasks = [t1];
		expect(applyReleaseTaskEvent(tasks, { taskIds: ["t-9"], status: "done" }, RELEASE_ID)).toBe(tasks);
	});

	it("ignores partial task payloads like { releaseId: null }", () => {
		const tasks = [t1];
		expect(applyReleaseTaskEvent(tasks, { releaseId: null }, RELEASE_ID)).toBe(tasks);
	});
});

describe("upsertReleaseRow", () => {
	const a = makeRelease();
	const b = makeRelease({ id: "rel-2", slug: "0.9.0" });

	it("replaces a release row in place", () => {
		const renamed = makeRelease({ name: "Renamed" });
		expect(upsertReleaseRow([a, b], renamed)).toEqual([renamed, b]);
	});

	it("appends a new release row", () => {
		expect(upsertReleaseRow([a], b)).toEqual([a, b]);
	});

	it("returns the same list for non-row payloads", () => {
		const list = [a];
		expect(upsertReleaseRow(list, { releaseId: RELEASE_ID })).toBe(list);
		expect(upsertReleaseRow(list, { taskId: "t-1", releaseId: null })).toBe(list);
		expect(upsertReleaseRow(list, [a])).toBe(list);
	});
});

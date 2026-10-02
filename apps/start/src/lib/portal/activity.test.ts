import { describe, expect, it } from "vitest";
import {
	type ActivityRelease,
	buildVoteBarSegments,
	buildVoteStatusRows,
	filterPostedBy,
	formatTabCount,
	resolveVotedPosts,
	selectShippedBecauseYouAsked,
} from "./activity";

const post = (id: string, status = "backlog", releaseId: string | null = null) => ({ id, status, releaseId });

const release = (id: string, overrides: Partial<ActivityRelease> = {}): ActivityRelease => ({
	id,
	name: `v${id}`,
	status: "released",
	releasedAt: "2026-03-01T00:00:00Z",
	...overrides,
});

describe("resolveVotedPosts", () => {
	it("returns the voted posts in the list's order and reports ids it could not find", () => {
		const tasks = [post("a"), post("b"), post("c")];
		const result = resolveVotedPosts([{ taskId: "c" }, { taskId: "a" }, { taskId: "gone" }], tasks);
		expect(result.posts.map((p) => p.id)).toEqual(["a", "c"]);
		expect(result.unresolvedIds).toEqual(["gone"]);
	});

	it("ignores duplicate vote entries", () => {
		const result = resolveVotedPosts(
			[{ taskId: "a" }, { taskId: "a" }, { taskId: "x" }, { taskId: "x" }],
			[post("a")]
		);
		expect(result.posts).toHaveLength(1);
		expect(result.unresolvedIds).toEqual(["x"]);
	});

	it("handles no votes and no tasks", () => {
		expect(resolveVotedPosts([], [post("a")])).toEqual({ posts: [], unresolvedIds: [] });
		expect(resolveVotedPosts([{ taskId: "a" }], [])).toEqual({ posts: [], unresolvedIds: ["a"] });
	});
});

describe("filterPostedBy", () => {
	const tasks = [
		{ id: "a", createdBy: { id: "me" } },
		{ id: "b", createdBy: { id: "them" } },
		{ id: "c", createdBy: null },
		{ id: "d" },
	];

	it("keeps only the viewer's posts", () => {
		expect(filterPostedBy(tasks, "me").map((t) => t.id)).toEqual(["a"]);
	});

	it("returns nothing without a user id", () => {
		expect(filterPostedBy(tasks, null)).toEqual([]);
		expect(filterPostedBy(tasks, undefined)).toEqual([]);
		expect(filterPostedBy(tasks, "")).toEqual([]);
	});
});

describe("selectShippedBecauseYouAsked", () => {
	it("keeps done posts in a released release only", () => {
		const releases = new Map([
			["r1", release("r1")],
			["r2", release("r2", { status: "planned" })],
			["r3", release("r3", { status: "archived" })],
		]);
		const posts = [
			post("shipped", "done", "r1"),
			post("not-done", "in-progress", "r1"),
			post("unreleased", "done", "r2"),
			post("archived", "done", "r3"),
			post("no-release", "done"),
			post("unknown-release", "done", "missing"),
		];
		expect(selectShippedBecauseYouAsked(posts, releases).map((s) => s.task.id)).toEqual(["shipped"]);
	});

	it("orders by release date, newest first, with undated releases last", () => {
		const releases = new Map([
			["old", release("old", { releasedAt: "2026-01-01T00:00:00Z" })],
			["new", release("new", { releasedAt: "2026-05-01T00:00:00Z" })],
			["undated", release("undated", { releasedAt: null, targetDate: null, createdAt: null })],
		]);
		const posts = [post("a", "done", "undated"), post("b", "done", "old"), post("c", "done", "new")];
		const result = selectShippedBecauseYouAsked(posts, releases);
		expect(result.map((s) => s.task.id)).toEqual(["c", "b", "a"]);
		expect(result[0]?.release.name).toBe("vnew");
		expect(result[2]?.date).toBeNull();
	});

	it("falls back to the target then created date for the release date", () => {
		const releases = new Map([["r", release("r", { releasedAt: null, targetDate: "2026-02-02T00:00:00Z" })]]);
		const [first] = selectShippedBecauseYouAsked([post("a", "done", "r")], releases);
		expect(first?.date?.toISOString()).toBe("2026-02-02T00:00:00.000Z");
	});

	it("caps the list at three by default and honours an explicit limit", () => {
		const releases = new Map([["r", release("r")]]);
		const posts = ["a", "b", "c", "d"].map((id) => post(id, "done", "r"));
		expect(selectShippedBecauseYouAsked(posts, releases)).toHaveLength(3);
		expect(selectShippedBecauseYouAsked(posts, releases, 1).map((s) => s.task.id)).toEqual(["a"]);
		expect(selectShippedBecauseYouAsked(posts, releases, 0)).toEqual([]);
	});
});

describe("buildVoteStatusRows", () => {
	it("counts per public status in legend order, with public labels", () => {
		const rows = buildVoteStatusRows([
			{ status: "done" },
			{ status: "backlog" },
			{ status: "backlog" },
			{ status: "in-progress" },
			{ status: "canceled" },
		]);
		expect(rows.map((r) => [r.label, r.count])).toEqual([
			["Done", 1],
			["In Progress", 1],
			["Planned", 0],
			["Open", 2],
			["Won't do", 1],
		]);
	});

	it("returns every row with zero counts when nothing is voted", () => {
		expect(buildVoteStatusRows([]).every((row) => row.count === 0)).toBe(true);
	});
});

describe("buildVoteBarSegments", () => {
	it("groups planned and open together and leaves Won't do off the bar", () => {
		const rows = buildVoteStatusRows([
			{ status: "done" },
			{ status: "in-progress" },
			{ status: "todo" },
			{ status: "backlog" },
			{ status: "canceled" },
		]);
		expect(buildVoteBarSegments(rows)).toEqual([
			{ value: 1, tone: "ok" },
			{ value: 1, tone: "accent" },
			{ value: 2, tone: "muted" },
		]);
	});
});

describe("formatTabCount", () => {
	it("adds a plus when the list is truncated", () => {
		expect(formatTabCount(3, false)).toBe("3");
		expect(formatTabCount(3, true)).toBe("3+");
	});
});

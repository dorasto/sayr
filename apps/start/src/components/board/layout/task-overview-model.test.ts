import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import { areFiltersEqual } from "../core/view-config";
import {
	buildAssigneePresetFilters,
	buildOrgPresetFilters,
	countCrossOrgTasks,
	countOpenTasksByStatus,
	formatTaskAttentionReason,
	selectMostVotedTasks,
	selectTasksNeedingAttention,
} from "./task-overview-model";

const NOW = new Date("2026-10-29T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

type Task = Pick<
	schema.TaskWithLabels,
	"id" | "status" | "priority" | "updatedAt" | "createdAt" | "voteCount" | "assignees"
>;

const ASSIGNEE = { id: "u1" } as schema.UserSummary;

function task(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		status: "todo",
		priority: "none",
		updatedAt: daysAgo(1),
		createdAt: daysAgo(30),
		voteCount: 0,
		assignees: [ASSIGNEE],
		...overrides,
	};
}

describe("countOpenTasksByStatus", () => {
	it("counts backlog, todo and in progress, ignoring done and canceled", () => {
		const tasks = [
			task("a", { status: "backlog" }),
			task("b", { status: "todo" }),
			task("c", { status: "todo" }),
			task("d", { status: "in-progress" }),
			task("e", { status: "done" }),
			task("f", { status: "canceled" }),
		];
		expect(countOpenTasksByStatus(tasks)).toEqual({ backlog: 1, todo: 2, "in-progress": 1 });
	});
});

describe("selectTasksNeedingAttention", () => {
	it("flags open urgent/high tasks that are unassigned or untouched for two weeks", () => {
		const tasks = [
			task("high-stale", { priority: "high", updatedAt: daysAgo(22) }),
			task("urgent-fresh", { priority: "urgent" }),
			task("medium-unassigned", { priority: "medium", assignees: [] }),
			task("high-unassigned", { priority: "high", assignees: [] }),
			task("urgent-stale", { priority: "urgent", updatedAt: daysAgo(15) }),
			task("urgent-unassigned", { priority: "urgent", assignees: [] }),
			task("done-urgent", { priority: "urgent", status: "done", assignees: [] }),
			task("high-staler", { priority: "high", updatedAt: daysAgo(40) }),
			task("high-13d", { priority: "high", updatedAt: daysAgo(13) }),
		];
		const result = selectTasksNeedingAttention(tasks, NOW, 10);
		expect(result.map((item) => item.task.id)).toEqual([
			"urgent-unassigned",
			"urgent-stale",
			"high-unassigned",
			"high-staler",
			"high-stale",
		]);
		expect(result.map((item) => formatTaskAttentionReason(item.reason))).toEqual([
			"Urgent · unassigned",
			"Urgent · no update 2w",
			"High · unassigned",
			"High · no update 5w",
			"High · no update 3w",
		]);
	});

	it("falls back to the creation time and caps the list", () => {
		const tasks = Array.from({ length: 7 }, (_, i) =>
			task(`t${i}`, { priority: "high", updatedAt: null, createdAt: daysAgo(20 + i) })
		);
		const result = selectTasksNeedingAttention(tasks, NOW);
		expect(result).toHaveLength(5);
		expect(result[0]?.task.id).toBe("t6");
	});
});

describe("selectMostVotedTasks", () => {
	it("lists open voted tasks by votes, most recently updated first on ties", () => {
		const tasks = [
			task("none"),
			task("two-old", { voteCount: 2, updatedAt: daysAgo(10) }),
			task("five", { voteCount: 5 }),
			task("closed", { voteCount: 9, status: "done" }),
			task("two-new", { voteCount: 2, updatedAt: daysAgo(2) }),
			task("one", { voteCount: 1 }),
		];
		expect(selectMostVotedTasks(tasks).map((t) => t.id)).toEqual(["five", "two-new", "two-old"]);
	});
});

describe("cross-org presets", () => {
	it("builds a single any-match org condition that equals the same quick filter", () => {
		expect(buildOrgPresetFilters("o1").groups[0]?.conditions).toEqual([
			{ id: "preset-org-o1-org", field: "org", operator: "any", value: ["o1"] },
		]);
		const fromQuickFilters = {
			operator: "AND" as const,
			groups: [
				{
					id: "group-0",
					operator: "AND" as const,
					conditions: [{ id: "filter-org-1", field: "org" as const, operator: "any" as const, value: ["o1"] }],
				},
			],
		};
		expect(areFiltersEqual(buildOrgPresetFilters("o1"), fromQuickFilters)).toBe(true);
		expect(areFiltersEqual(buildOrgPresetFilters("o2"), fromQuickFilters)).toBe(false);
		expect(areFiltersEqual(buildAssigneePresetFilters("o1"), fromQuickFilters)).toBe(false);
	});
});

describe("countCrossOrgTasks", () => {
	const zeta = { id: "z", name: "Zeta", slug: "zeta", logo: null, shortId: "ZET" };
	const acme = { id: "a", name: "Acme", slug: "acme", logo: "acme.png", shortId: "ACM" };
	const tasks = [
		{ status: "todo", organizationId: "z", organization: zeta, assignees: [{ id: "me" }] },
		{ status: "in-progress", organizationId: "a", organization: acme, assignees: [{ id: "other" }] },
		{ status: "backlog", organizationId: "a", organization: acme, assignees: [{ id: "me" }] },
		{ status: "done", organizationId: "a", organization: acme, assignees: [{ id: "me" }] },
		{ status: "canceled", organizationId: "q", organization: { ...zeta, id: "q", name: "Quiet" }, assignees: [] },
		{ status: "todo", organizationId: "x", organization: undefined, assignees: [] },
	] satisfies Parameters<typeof countCrossOrgTasks>[0];

	it("counts open tasks, the viewer's open tasks, and open tasks per org (orgs by name, closed-only included)", () => {
		expect(countCrossOrgTasks(tasks, "me")).toEqual({
			open: 4,
			openAssignedToViewer: 2,
			orgs: [
				{ id: "a", name: "Acme", logo: "acme.png", open: 2 },
				{ id: "q", name: "Quiet", logo: null, open: 0 },
				{ id: "z", name: "Zeta", logo: null, open: 1 },
			],
		});
	});

	it("counts nothing for the viewer without a viewer id", () => {
		expect(countCrossOrgTasks(tasks, undefined).openAssignedToViewer).toBe(0);
	});
});

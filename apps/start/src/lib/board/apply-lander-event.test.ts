import type { schema } from "@repo/database";
import { describe, expect, it } from "vitest";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { createTaskCreatedMessage } from "../task-created-message";
import {
	applyLanderEvent,
	applyLanderWindowMessage,
	isSseReconnectedMessage,
	type LanderData,
	type LanderEventContext,
	type LanderTask,
	type LanderTaskOrganization,
	replaceTask,
	replaceTasks,
	upsertTask,
} from "./apply-lander-event";

const ORG_A: LanderTaskOrganization = { id: "org-a", name: "Acme", slug: "acme", shortId: "ACM", logo: null };
const ORG_B: LanderTaskOrganization = {
	id: "org-b",
	name: "Beta",
	slug: "beta",
	shortId: "BET",
	logo: "https://cdn/b.png",
};
const organizations = new Map([
	[ORG_A.id, ORG_A],
	[ORG_B.id, ORG_B],
]);
const context: LanderEventContext = { organizations };

function makeTask(overrides: Partial<LanderTask> & Pick<LanderTask, "id">): LanderTask {
	return {
		organizationId: ORG_A.id,
		shortId: 1,
		visible: "public",
		createdAt: new Date(0),
		updatedAt: new Date(0),
		title: "Task",
		description: { type: "doc" },
		status: "todo",
		priority: "none",
		category: null,
		releaseId: null,
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

function makeLabel(id: string, organizationId: string, name = id): schema.labelType {
	return { id, organizationId, name, color: "#cccccc", visible: "public", createdAt: new Date(0) };
}

function makeCategory(id: string, organizationId: string, name = id): schema.categoryType {
	return { id, organizationId, name, color: null, icon: null, createdAt: new Date(0) };
}

function makeRelease(
	id: string,
	organizationId: string,
	overrides: Partial<schema.releaseType> = {}
): schema.releaseType {
	return {
		id,
		organizationId,
		name: id,
		slug: id,
		description: null,
		status: "planned",
		targetDate: null,
		releasedAt: null,
		color: "#123456",
		icon: null,
		leadId: null,
		createdBy: null,
		createdAt: new Date(0),
		updatedAt: new Date(0),
		...overrides,
	};
}

/** The columns of the `release` table, i.e. the only keys a release in the board's store may have. */
const RELEASE_CATALOG_KEYS = [
	"id",
	"organizationId",
	"name",
	"slug",
	"description",
	"status",
	"targetDate",
	"releasedAt",
	"color",
	"icon",
	"leadId",
	"createdBy",
	"createdAt",
	"updatedAt",
].sort();

/** A row as it arrives over SSE: JSON, so every Date became an ISO string. */
function overTheWire<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

function makeData(overrides: Partial<LanderData> = {}): LanderData {
	return { tasks: [], labels: [], categories: [], releases: [], ...overrides };
}

/** Freezes everything reachable, so any in-place mutation by the code under test throws. */
function deepFreeze<T>(value: T): T {
	if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}

/**
 * A room broadcast as it really arrives over SSE: `sseBroadcastToRoom` adds `meta` (with the org) but
 * never a `scope` — only the public and per-user broadcasts set one — whatever the message type says.
 */
function roomMessage(
	type: ServerEventMessage["type"],
	data: unknown,
	/** `null` builds a message whose `meta` has no org at all. */
	orgId: string | null = ORG_A.id
): ServerEventMessage {
	return { type, data, meta: orgId === null ? { ts: 1 } : { ts: 1, orgId } } as ServerEventMessage;
}

function taskEvent(type: "CREATE_TASK" | "UPDATE_TASK", data: LanderTask): ServerEventMessage {
	return roomMessage(type, data, data.organizationId);
}

function voteEvent(id: string, voteCount: number): ServerEventMessage {
	return roomMessage("UPDATE_TASK_VOTE", { id, voteCount });
}

function labelsEvent(orgId: string, data: schema.labelType[], scope: ServerEventMessage["scope"] = "INDIVIDUAL") {
	return { type: "UPDATE_LABELS", scope, data, meta: { ts: 1, orgId } } satisfies ServerEventMessage;
}

function categoriesEvent(
	orgId: string,
	data: schema.categoryType[],
	scope: ServerEventMessage["scope"] = "INDIVIDUAL"
) {
	return { type: "UPDATE_CATEGORIES", scope, data, meta: { ts: 1, orgId } } satisfies ServerEventMessage;
}

/** The release routes send UPDATE_TASK payloads that aren't task records (a bulk close, a bare `{ releaseId: null }`) — not expressible in the message type. */
function rawTaskEvent(data: unknown): ServerEventMessage {
	return roomMessage("UPDATE_TASK", data);
}

function releaseEvent(data: unknown, orgId: string | null = ORG_A.id): ServerEventMessage {
	return roomMessage("UPDATE_RELEASES", data, orgId);
}

function releaseDeletedEvent(releaseId: unknown, orgId: string | null = ORG_A.id): ServerEventMessage {
	return roomMessage("DELETE_RELEASE", { releaseId }, orgId);
}

/** The same message, but as the public portal's broadcast delivers it. */
function asPublic(message: ServerEventMessage): ServerEventMessage {
	return { ...message, scope: "PUBLIC" } as ServerEventMessage;
}

function applyAll(initial: LanderData, events: ServerEventMessage[]): LanderData {
	return events.reduce((data, event) => applyLanderEvent(data, event, context), initial);
}

describe("upsertTask", () => {
	it("appends a task that isn't in the list yet, with its organization attached", () => {
		const existing = makeTask({ id: "t1" });
		const next = upsertTask([existing], makeTask({ id: "t2", organizationId: ORG_B.id }), organizations);

		expect(next.map((task) => task.id)).toEqual(["t1", "t2"]);
		expect(next[1]?.organization).toBe(ORG_B);
	});

	it("replaces a task in place, keeping list order, and is idempotent for a duplicate event", () => {
		const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" }), makeTask({ id: "t3" })];
		const updated = makeTask({ id: "t2", status: "done" });

		const once = upsertTask(tasks, updated, organizations);
		const twice = upsertTask(once, updated, organizations);

		expect(once.map((task) => [task.id, task.status])).toEqual([
			["t1", "todo"],
			["t2", "done"],
			["t3", "todo"],
		]);
		expect(twice).toEqual(once);
		expect(twice).toHaveLength(3);
	});

	it("keeps every other task's identity", () => {
		const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" })];
		const next = upsertTask(tasks, makeTask({ id: "t2", title: "Renamed" }), organizations);

		expect(next[0]).toBe(tasks[0]);
	});

	it("falls back to the replaced task's organization when the org isn't a known snapshot", () => {
		const orphanOrg: LanderTaskOrganization = { id: "org-x", name: "X", slug: "x", shortId: "XXX", logo: null };
		const existing = makeTask({ id: "t1", organizationId: "org-x", organization: orphanOrg });

		const next = upsertTask(
			[existing],
			makeTask({ id: "t1", organizationId: "org-x", status: "done" }),
			organizations
		);

		expect(next[0]?.organization).toBe(orphanOrg);
		expect(next[0]?.status).toBe("done");
	});

	it("prefers the live organization snapshot over a stale one", () => {
		const renamed: LanderTaskOrganization = { ...ORG_A, name: "Acme Renamed" };
		const existing = makeTask({ id: "t1", organization: ORG_A });

		const next = upsertTask([existing], makeTask({ id: "t1" }), new Map([[renamed.id, renamed]]));

		expect(next[0]?.organization).toBe(renamed);
	});
});

describe("replaceTask / replaceTasks", () => {
	it("swaps the record in but keeps the replaced task's organization when the response has none", () => {
		const existing = makeTask({ id: "t1", organization: ORG_A });
		const fromApi = makeTask({ id: "t1", status: "done" });

		const [next] = replaceTask([existing], fromApi);

		expect(next?.status).toBe("done");
		expect(next?.organization).toBe(ORG_A);
	});

	it("never adds a task that isn't in the list, and returns the same list when nothing matched", () => {
		const tasks = [makeTask({ id: "t1" })];

		expect(replaceTask(tasks, makeTask({ id: "gone" }))).toBe(tasks);
	});

	it("replaces several tasks at once and leaves the rest alone", () => {
		const tasks = [makeTask({ id: "t1" }), makeTask({ id: "t2" }), makeTask({ id: "t3" })];
		const next = replaceTasks(
			tasks,
			new Map([
				["t1", makeTask({ id: "t1", priority: "high" })],
				["t3", makeTask({ id: "t3", priority: "high" })],
			])
		);

		expect(next.map((task) => task.priority)).toEqual(["high", "none", "high"]);
		expect(next[1]).toBe(tasks[1]);
	});
});

describe("applyLanderEvent: CREATE_TASK / UPDATE_TASK", () => {
	it("adds a created task and attaches its organization badge data", () => {
		const next = applyLanderEvent(makeData(), taskEvent("CREATE_TASK", makeTask({ id: "t1" })), context);

		expect(next.tasks).toHaveLength(1);
		expect(next.tasks[0]?.organization).toEqual(ORG_A);
	});

	it("does not duplicate a task when the same CREATE_TASK is delivered twice", () => {
		const event = taskEvent("CREATE_TASK", makeTask({ id: "t1" }));
		const next = applyAll(makeData(), [event, event]);

		expect(next.tasks).toHaveLength(1);
	});

	it("applies create-then-update for the same task", () => {
		const next = applyAll(makeData(), [
			taskEvent("CREATE_TASK", makeTask({ id: "t1", title: "Draft" })),
			taskEvent("UPDATE_TASK", makeTask({ id: "t1", title: "Final", status: "in-progress" })),
		]);

		expect(next.tasks).toHaveLength(1);
		expect(next.tasks[0]).toMatchObject({ id: "t1", title: "Final", status: "in-progress", organization: ORG_A });
	});

	it("applies a burst of updates to different tasks without losing any of them", () => {
		// The regression this guards: the old handler wrote `tasksRef.current.map(...)`, where the ref only
		// refreshed on render, so the second of two events arriving before a re-render overwrote the first.
		const initial = makeData({
			tasks: [makeTask({ id: "t1" }), makeTask({ id: "t2" }), makeTask({ id: "t3" }), makeTask({ id: "t4" })],
		});

		const next = applyAll(initial, [
			taskEvent("UPDATE_TASK", makeTask({ id: "t1", status: "done" })),
			taskEvent("UPDATE_TASK", makeTask({ id: "t2", status: "done" })),
			taskEvent("UPDATE_TASK", makeTask({ id: "t3", priority: "urgent" })),
			taskEvent("UPDATE_TASK", makeTask({ id: "t1", title: "t1 again" })),
		]);

		expect(next.tasks.map((task) => [task.id, task.status, task.priority, task.title])).toEqual([
			["t1", "todo", "none", "t1 again"],
			["t2", "done", "none", "Task"],
			["t3", "todo", "urgent", "Task"],
			["t4", "todo", "none", "Task"],
		]);
	});

	it("adds an UPDATE_TASK for a task the board never saw created (a missed CREATE_TASK)", () => {
		const next = applyLanderEvent(makeData(), taskEvent("UPDATE_TASK", makeTask({ id: "t9" })), context);

		expect(next.tasks.map((task) => task.id)).toEqual(["t9"]);
	});

	it("keeps cross-org tasks' organization through updates", () => {
		const initial = makeData({
			tasks: [
				makeTask({ id: "a1", organization: ORG_A }),
				makeTask({ id: "b1", organizationId: ORG_B.id, organization: ORG_B }),
			],
		});

		const next = applyAll(initial, [
			taskEvent("UPDATE_TASK", makeTask({ id: "b1", organizationId: ORG_B.id, status: "done" })),
			taskEvent("UPDATE_TASK", makeTask({ id: "a1", status: "done" })),
		]);

		expect(next.tasks.map((task) => task.organization?.id)).toEqual([ORG_A.id, ORG_B.id]);
		expect(next.tasks.every((task) => task.status === "done")).toBe(true);
	});

	it("ignores UPDATE_TASK payloads that aren't a full task record", () => {
		const initial = makeData({ tasks: [makeTask({ id: "t1" })] });

		expect(applyLanderEvent(initial, rawTaskEvent(undefined), context)).toBe(initial);
		expect(applyLanderEvent(initial, rawTaskEvent(null), context)).toBe(initial);
		expect(applyLanderEvent(initial, rawTaskEvent({ releaseId: null }), context)).toBe(initial);
		// Has an id but not the arrays every row reads unguarded.
		expect(applyLanderEvent(initial, rawTaskEvent({ id: "t1", organizationId: ORG_A.id }), context)).toBe(initial);
	});

	it("closes the tasks a published release auto-closed, ignoring ids the board doesn't have", () => {
		const initial = makeData({
			tasks: [makeTask({ id: "t1" }), makeTask({ id: "t2", status: "in-progress" }), makeTask({ id: "t3" })],
		});

		const next = applyLanderEvent(initial, rawTaskEvent({ taskIds: ["t1", "t2", "nope"], status: "done" }), context);

		expect(next.tasks.map((task) => task.status)).toEqual(["done", "done", "todo"]);
		expect(next.tasks[2]).toBe(initial.tasks[2]);
	});

	it("leaves the data untouched when an auto-close changes nothing", () => {
		const initial = makeData({ tasks: [makeTask({ id: "t1", status: "done" })] });

		expect(applyLanderEvent(initial, rawTaskEvent({ taskIds: ["t1"], status: "done" }), context)).toBe(initial);
		expect(applyLanderEvent(initial, rawTaskEvent({ taskIds: ["t1"], status: "backlog" }), context)).toBe(initial);
	});

	it("does not mutate its input", () => {
		const initial = deepFreeze(makeData({ tasks: [makeTask({ id: "t1" })] }));

		expect(() =>
			applyAll(initial, [
				taskEvent("CREATE_TASK", makeTask({ id: "t2" })),
				taskEvent("UPDATE_TASK", makeTask({ id: "t1", status: "done" })),
				voteEvent("t1", 3),
			])
		).not.toThrow();
	});
});

describe("applyLanderEvent: UPDATE_TASK_VOTE", () => {
	it("updates just the vote count", () => {
		const initial = makeData({ tasks: [makeTask({ id: "t1", title: "Keep me" }), makeTask({ id: "t2" })] });

		const next = applyLanderEvent(initial, voteEvent("t1", 4), context);

		expect(next.tasks[0]).toMatchObject({ id: "t1", title: "Keep me", voteCount: 4 });
		expect(next.tasks[1]).toBe(initial.tasks[1]);
	});

	it("is a no-op for a duplicate vote event, an unknown task or a malformed payload", () => {
		const initial = makeData({ tasks: [makeTask({ id: "t1", voteCount: 2 })] });

		expect(applyLanderEvent(initial, voteEvent("t1", 2), context)).toBe(initial);
		expect(applyLanderEvent(initial, voteEvent("nope", 9), context)).toBe(initial);
		expect(
			applyLanderEvent(
				initial,
				{ type: "UPDATE_TASK_VOTE", scope: "CHANNEL", data: { id: "t1" } } as ServerEventMessage,
				context
			)
		).toBe(initial);
	});

	it("composes with a task update that arrives right after it", () => {
		const next = applyAll(makeData({ tasks: [makeTask({ id: "t1" })] }), [
			voteEvent("t1", 5),
			taskEvent("UPDATE_TASK", makeTask({ id: "t1", status: "done", voteCount: 5 })),
		]);

		expect(next.tasks[0]).toMatchObject({ status: "done", voteCount: 5 });
	});
});

describe("applyLanderEvent: UPDATE_LABELS", () => {
	const initial = makeData({
		labels: [
			makeLabel("a-bug", ORG_A.id, "bug"),
			makeLabel("b-bug", ORG_B.id, "bug"),
			makeLabel("a-ui", ORG_A.id, "ui"),
		],
	});

	it("replaces only the event's org slice and leaves the other orgs' labels untouched", () => {
		const next = applyLanderEvent(
			initial,
			labelsEvent(ORG_A.id, [makeLabel("a-bug", ORG_A.id, "defect"), makeLabel("a-new", ORG_A.id, "new")]),
			context
		);

		expect(next.labels.map((label) => [label.id, label.name])).toEqual([
			["a-bug", "defect"],
			["a-new", "new"],
			["b-bug", "bug"],
		]);
		expect(next.labels[2]).toBe(initial.labels[1]);
	});

	it("puts the slice back where the org's labels were, so orgs don't reshuffle", () => {
		const next = applyLanderEvent(initial, labelsEvent(ORG_B.id, [makeLabel("b-bug", ORG_B.id, "renamed")]), context);

		expect(next.labels.map((label) => label.id)).toEqual(["a-bug", "b-bug", "a-ui"]);
	});

	it("drops the whole slice when the org has no labels left, and adds a slice for an org that had none", () => {
		expect(applyLanderEvent(initial, labelsEvent(ORG_A.id, []), context).labels.map((label) => label.id)).toEqual([
			"b-bug",
		]);
		expect(
			applyLanderEvent(makeData(), labelsEvent(ORG_A.id, [makeLabel("a-1", ORG_A.id)]), context).labels.map(
				(label) => label.id
			)
		).toEqual(["a-1"]);
	});

	it("pushes a rename into the labels tasks carry, and removes a deleted label from them", () => {
		const data = makeData({
			labels: [makeLabel("a-bug", ORG_A.id, "bug"), makeLabel("a-ui", ORG_A.id, "ui")],
			tasks: [
				makeTask({ id: "t1", labels: [makeLabel("a-bug", ORG_A.id, "bug"), makeLabel("a-ui", ORG_A.id, "ui")] }),
				makeTask({ id: "t2", labels: [] }),
				makeTask({
					id: "b1",
					organizationId: ORG_B.id,
					labels: [makeLabel("a-bug", ORG_B.id, "bug")],
				}),
			],
		});

		const next = applyLanderEvent(data, labelsEvent(ORG_A.id, [makeLabel("a-bug", ORG_A.id, "defect")]), context);

		expect(next.tasks[0]?.labels.map((label) => [label.id, label.name])).toEqual([["a-bug", "defect"]]);
		expect(next.tasks[1]).toBe(data.tasks[1]);
		// Another org's task is never touched, even though it holds a label with the same id.
		expect(next.tasks[2]).toBe(data.tasks[2]);
	});

	it("keeps a task's identity when its labels didn't actually change", () => {
		const bug = makeLabel("a-bug", ORG_A.id, "bug");
		const data = makeData({ labels: [bug], tasks: [makeTask({ id: "t1", labels: [bug] })] });

		const next = applyLanderEvent(data, labelsEvent(ORG_A.id, [{ ...bug }]), context);

		expect(next.tasks[0]).toBe(data.tasks[0]);
	});

	it("is idempotent for a duplicate event", () => {
		const event = labelsEvent(ORG_A.id, [makeLabel("a-bug", ORG_A.id, "defect")]);
		const once = applyLanderEvent(initial, event, context);

		expect(applyLanderEvent(once, event, context)).toEqual(once);
	});

	it("ignores events that aren't the org's complete INDIVIDUAL list, or that belong to an org the board doesn't show", () => {
		const fresh = [makeLabel("x-1", ORG_A.id)];

		// PUBLIC scope carries only the public labels — applying it would drop private ones.
		expect(applyLanderEvent(initial, labelsEvent(ORG_A.id, fresh, "PUBLIC"), context)).toBe(initial);
		expect(applyLanderEvent(initial, labelsEvent(ORG_A.id, fresh, "CHANNEL"), context)).toBe(initial);
		expect(applyLanderEvent(initial, labelsEvent("org-unknown", [makeLabel("u-1", "org-unknown")]), context)).toBe(
			initial
		);
		expect(
			applyLanderEvent(
				initial,
				{ type: "UPDATE_LABELS", scope: "INDIVIDUAL", data: fresh } satisfies ServerEventMessage,
				context
			)
		).toBe(initial);
	});
});

describe("applyLanderEvent: UPDATE_CATEGORIES", () => {
	const initial = makeData({
		categories: [makeCategory("a-1", ORG_A.id, "Backend"), makeCategory("b-1", ORG_B.id, "Design")],
		tasks: [makeTask({ id: "t1", category: "a-1" })],
	});

	it("replaces only the event's org slice", () => {
		const next = applyLanderEvent(
			initial,
			categoriesEvent(ORG_A.id, [makeCategory("a-1", ORG_A.id, "Platform"), makeCategory("a-2", ORG_A.id, "Web")]),
			context
		);

		expect(next.categories.map((category) => [category.id, category.name])).toEqual([
			["a-1", "Platform"],
			["a-2", "Web"],
			["b-1", "Design"],
		]);
		expect(next.categories[2]).toBe(initial.categories[1]);
		expect(next.tasks).toBe(initial.tasks);
	});

	it("applies the same scope and org rules as labels", () => {
		const fresh = [makeCategory("x-1", ORG_A.id)];

		expect(applyLanderEvent(initial, categoriesEvent(ORG_A.id, fresh, "PUBLIC"), context)).toBe(initial);
		expect(applyLanderEvent(initial, categoriesEvent("org-unknown", fresh), context)).toBe(initial);
	});

	it("is idempotent for a duplicate event", () => {
		const event = categoriesEvent(ORG_B.id, [makeCategory("b-1", ORG_B.id, "UX")]);
		const once = applyLanderEvent(initial, event, context);

		expect(applyLanderEvent(once, event, context)).toEqual(once);
	});
});

describe("applyLanderEvent: UPDATE_RELEASES", () => {
	const a1 = makeRelease("a1", ORG_A.id, { name: "Alpha 1" });
	const a2 = makeRelease("a2", ORG_A.id, { name: "Alpha 2" });
	const b1 = makeRelease("b1", ORG_B.id, { name: "Beta 1" });
	const initial = makeData({ releases: [a1, a2, b1] });

	it("adds a created release after the last release of its own org, keeping orgs together", () => {
		const forA = applyLanderEvent(initial, releaseEvent(overTheWire(makeRelease("a3", ORG_A.id))), context);
		expect(forA.releases.map((release) => release.id)).toEqual(["a1", "a2", "a3", "b1"]);

		const forB = applyLanderEvent(initial, releaseEvent(overTheWire(makeRelease("b2", ORG_B.id)), ORG_B.id), context);
		expect(forB.releases.map((release) => release.id)).toEqual(["a1", "a2", "b1", "b2"]);
	});

	it("adds the first release of an org that had none, at the end", () => {
		const onlyA = makeData({ releases: [a1] });
		const next = applyLanderEvent(onlyA, releaseEvent(overTheWire(makeRelease("b1", ORG_B.id)), ORG_B.id), context);

		expect(next.releases.map((release) => release.id)).toEqual(["a1", "b1"]);
	});

	it("updates a release in place and leaves every other release's identity alone", () => {
		const renamed = makeRelease("a2", ORG_A.id, { name: "Alpha Two", color: "#ff0000" });
		const next = applyLanderEvent(initial, releaseEvent(overTheWire(renamed)), context);

		expect(next.releases.map((release) => [release.id, release.name])).toEqual([
			["a1", "Alpha 1"],
			["a2", "Alpha Two"],
			["b1", "Beta 1"],
		]);
		expect(next.releases[1]?.color).toBe("#ff0000");
		expect(next.releases[0]).toBe(a1);
		expect(next.releases[2]).toBe(b1);
		expect(next.tasks).toBe(initial.tasks);
		expect(next.labels).toBe(initial.labels);
		expect(next.categories).toBe(initial.categories);
	});

	it("applies a publish: the released status, and composes with the tasks it auto-closed", () => {
		const data = makeData({
			releases: [a1],
			tasks: [
				makeTask({ id: "t1", releaseId: "a1" }),
				makeTask({ id: "t2", releaseId: "a1", status: "in-progress" }),
			],
		});
		const published = makeRelease("a1", ORG_A.id, {
			name: "Alpha 1",
			status: "released",
			releasedAt: new Date("2026-05-01T00:00:00Z"),
		});

		const next = applyAll(data, [
			releaseEvent(overTheWire(published)),
			rawTaskEvent({ taskIds: ["t1", "t2"], status: "done" }),
		]);

		expect(next.releases[0]?.status).toBe("released");
		expect(new Date(next.releases[0]?.releasedAt ?? 0).toISOString()).toBe("2026-05-01T00:00:00.000Z");
		expect(next.tasks.map((task) => task.status)).toEqual(["done", "done"]);
	});

	it("is a no-op, returning the same data, for a duplicate event", () => {
		const event = releaseEvent(overTheWire(makeRelease("a3", ORG_A.id)));
		const once = applyLanderEvent(initial, event, context);

		expect(applyLanderEvent(once, event, context)).toBe(once);
		expect(once.releases.filter((release) => release.id === "a3")).toHaveLength(1);
	});

	it("treats the wire copy of a row the loader already delivered as unchanged (ISO string vs Date)", () => {
		const loaded = makeRelease("a1", ORG_A.id, { name: "Alpha 1", targetDate: new Date("2026-06-01T12:00:00Z") });
		const data = makeData({ releases: [loaded] });

		expect(applyLanderEvent(data, releaseEvent(overTheWire(loaded)), context)).toBe(data);
	});

	it("ignores payloads that aren't a release row", () => {
		const row = makeRelease("a9", ORG_A.id);
		const notRows: unknown[] = [
			undefined,
			null,
			"a1",
			42,
			[],
			[row],
			{ releaseId: "a1" }, // release labels / pull requests changed
			{ taskId: "t1", releaseId: "a1" }, // a task was moved into a release
			{ taskId: "t1", releaseId: null },
			{ ...row, id: undefined },
			{ ...row, organizationId: undefined },
			{ ...row, name: 7 },
			{ ...row, slug: null },
			{ ...row, status: undefined },
		];

		for (const payload of notRows) {
			expect(applyLanderEvent(initial, releaseEvent(payload), context)).toBe(initial);
		}
	});

	it("ignores releases of an org the board isn't showing", () => {
		const foreign = makeRelease("x1", "org-unknown");

		expect(applyLanderEvent(initial, releaseEvent(overTheWire(foreign), "org-unknown"), context)).toBe(initial);
		// the row's own organizationId decides, not the envelope's
		expect(applyLanderEvent(initial, releaseEvent(overTheWire(foreign), ORG_A.id), context)).toBe(initial);
	});

	it("ignores the public portal's copy of the event", () => {
		const event = asPublic(releaseEvent(overTheWire(makeRelease("a3", ORG_A.id))));

		expect(applyLanderEvent(initial, event, context)).toBe(initial);
	});

	it("keeps only the release table's columns, whatever else the payload carries", () => {
		const padded = {
			...overTheWire(makeRelease("a3", ORG_A.id)),
			internalNotes: "do not show",
			tasks: [{ id: "t1" }],
		};
		const next = applyLanderEvent(initial, releaseEvent(padded), context);
		const added = next.releases.find((release) => release.id === "a3");

		expect(Object.keys(added ?? {}).sort()).toEqual(RELEASE_CATALOG_KEYS);
	});

	it("does not mutate its input", () => {
		const frozen = deepFreeze(makeData({ releases: [a1, b1], tasks: [makeTask({ id: "t1", releaseId: "a1" })] }));

		expect(() =>
			applyAll(frozen, [
				releaseEvent(overTheWire(makeRelease("a1", ORG_A.id, { name: "Renamed" }))),
				releaseEvent(overTheWire(makeRelease("a2", ORG_A.id))),
				releaseDeletedEvent("a1"),
			])
		).not.toThrow();
	});
});

describe("applyLanderEvent: DELETE_RELEASE", () => {
	const a1 = makeRelease("a1", ORG_A.id);
	const a2 = makeRelease("a2", ORG_A.id);
	const b1 = makeRelease("b1", ORG_B.id);

	it("removes the release and clears it from the tasks that referenced it", () => {
		const data = makeData({
			releases: [a1, a2, b1],
			tasks: [
				makeTask({ id: "t1", releaseId: "a1" }),
				makeTask({ id: "t2", releaseId: "a2" }),
				makeTask({ id: "t3", releaseId: null }),
			],
		});

		const next = applyLanderEvent(data, releaseDeletedEvent("a1"), context);

		expect(next.releases).toEqual([a2, b1]);
		expect(next.tasks.map((task) => task.releaseId)).toEqual([null, "a2", null]);
		expect(next.tasks[1]).toBe(data.tasks[1]);
		expect(next.tasks[2]).toBe(data.tasks[2]);
		expect(next.labels).toBe(data.labels);
	});

	it("only touches the deleting org's tasks and releases", () => {
		// Ids are unique in practice; this pins that the org in the envelope scopes the change anyway.
		const data = makeData({
			releases: [a1, makeRelease("a1", ORG_B.id)],
			tasks: [
				makeTask({ id: "t1", releaseId: "a1" }),
				makeTask({ id: "t2", organizationId: ORG_B.id, releaseId: "a1" }),
			],
		});

		const next = applyLanderEvent(data, releaseDeletedEvent("a1", ORG_A.id), context);

		expect(next.releases).toHaveLength(1);
		expect(next.releases[0]?.organizationId).toBe(ORG_B.id);
		expect(next.tasks.map((task) => task.releaseId)).toEqual([null, "a1"]);
	});

	it("is a no-op, returning the same data, for a duplicate event", () => {
		const data = makeData({ releases: [a1], tasks: [makeTask({ id: "t1", releaseId: "a1" })] });
		const once = applyLanderEvent(data, releaseDeletedEvent("a1"), context);

		expect(applyLanderEvent(once, releaseDeletedEvent("a1"), context)).toBe(once);
	});

	it("still clears tasks when the release was already missing from the list", () => {
		const data = makeData({ releases: [a2], tasks: [makeTask({ id: "t1", releaseId: "a1" })] });
		const next = applyLanderEvent(data, releaseDeletedEvent("a1"), context);

		expect(next.releases).toBe(data.releases);
		expect(next.tasks[0]?.releaseId).toBeNull();
	});

	it("ignores an unknown release, an org the board isn't showing, a missing org and malformed payloads", () => {
		const data = makeData({ releases: [a1], tasks: [makeTask({ id: "t1", releaseId: "a1" })] });

		expect(applyLanderEvent(data, releaseDeletedEvent("nope"), context)).toBe(data);
		expect(applyLanderEvent(data, releaseDeletedEvent("a1", "org-unknown"), context)).toBe(data);
		expect(applyLanderEvent(data, releaseDeletedEvent("a1", null), context)).toBe(data);
		expect(applyLanderEvent(data, releaseDeletedEvent(undefined), context)).toBe(data);
		expect(applyLanderEvent(data, releaseDeletedEvent(123), context)).toBe(data);
		expect(applyLanderEvent(data, roomMessage("DELETE_RELEASE", undefined), context)).toBe(data);
		expect(applyLanderEvent(data, roomMessage("DELETE_RELEASE", "a1"), context)).toBe(data);
		expect(applyLanderEvent(data, asPublic(releaseDeletedEvent("a1")), context)).toBe(data);
	});

	it("won't act for an org the board isn't showing even if it somehow holds that org's data", () => {
		const stray = makeData({
			releases: [makeRelease("x1", "org-unknown")],
			tasks: [makeTask({ id: "t1", organizationId: "org-unknown", releaseId: "x1" })],
		});

		expect(applyLanderEvent(stray, releaseDeletedEvent("x1", "org-unknown"), context)).toBe(stray);
	});

	it("leaves the bare UPDATE_TASK { releaseId: null } ping alone — the delete event already did the work", () => {
		const data = makeData({ releases: [a1], tasks: [makeTask({ id: "t1", releaseId: "a1" })] });
		const afterDelete = applyLanderEvent(data, releaseDeletedEvent("a1"), context);

		expect(applyLanderEvent(afterDelete, rawTaskEvent({ releaseId: null }), context)).toBe(afterDelete);
	});
});

describe("applyLanderWindowMessage (task-created)", () => {
	it("applies the created task like an SSE CREATE_TASK, org badge attached", () => {
		const created = makeTask({ id: "t1", organizationId: ORG_B.id, title: "From the dialog" });

		const viaMessage = applyLanderWindowMessage(makeData(), createTaskCreatedMessage(created), context);
		const viaSse = applyLanderEvent(makeData(), taskEvent("CREATE_TASK", created), context);

		expect(viaMessage.tasks).toHaveLength(1);
		expect(viaMessage.tasks[0]).toMatchObject({ id: "t1", title: "From the dialog", organization: ORG_B });
		expect(viaMessage).toEqual(viaSse);
	});

	it("keeps a created subtask's parent link", () => {
		const parent = makeTask({ id: "p1" });
		const child = makeTask({ id: "c1", parentId: "p1" });

		const next = applyLanderWindowMessage(makeData({ tasks: [parent] }), createTaskCreatedMessage(child), context);

		expect(next.tasks.map((task) => [task.id, task.parentId])).toEqual([
			["p1", null],
			["c1", "p1"],
		]);
	});

	it("does not duplicate the task when the message is delivered twice, or when the SSE event arrives too", () => {
		const created = makeTask({ id: "t1" });
		const message = createTaskCreatedMessage(created);

		const twice = applyLanderWindowMessage(applyLanderWindowMessage(makeData(), message, context), message, context);
		const thenSse = applyLanderEvent(twice, taskEvent("CREATE_TASK", created), context);

		expect(twice.tasks).toHaveLength(1);
		expect(thenSse.tasks).toHaveLength(1);
	});

	it("composes with SSE events that land before or after it", () => {
		const next = applyAll(makeData({ tasks: [makeTask({ id: "t0" })] }), [
			taskEvent("UPDATE_TASK", makeTask({ id: "t0", status: "done" })),
		]);
		const withCreated = applyLanderWindowMessage(next, createTaskCreatedMessage(makeTask({ id: "t1" })), context);
		const final = applyLanderEvent(withCreated, voteEvent("t1", 2), context);

		expect(final.tasks.map((task) => [task.id, task.status, task.voteCount])).toEqual([
			["t0", "done", 0],
			["t1", "todo", 2],
		]);
	});

	it("ignores a task of an org the board isn't showing", () => {
		const data = makeData();
		const foreign = makeTask({ id: "t1", organizationId: "org-unknown" });

		expect(applyLanderWindowMessage(data, createTaskCreatedMessage(foreign), context)).toBe(data);
	});

	it("ignores malformed messages and every other window message", () => {
		const data = makeData({ tasks: [makeTask({ id: "t1" })] });
		const partial = { id: "t2", organizationId: ORG_A.id };
		const ignored: unknown[] = [
			undefined,
			null,
			"task-created",
			42,
			{ type: "task-created" },
			{ type: "task-created", payload: null },
			{ type: "task-created", payload: "t2" },
			{ type: "task-created", payload: partial },
			{ type: "task-created", payload: { ...partial, labels: [] } }, // no assignees
			{ type: "SSE_RECONNECTED" },
			{ type: "timeline-update", payload: "t1" },
			{ type: "task-created-ish", payload: makeTask({ id: "t2" }) },
			{ payload: makeTask({ id: "t2" }) },
		];

		for (const message of ignored) {
			expect(applyLanderWindowMessage(data, message, context)).toBe(data);
		}
	});
});

describe("applyLanderEvent: everything else", () => {
	it("returns the same data for events the board doesn't handle", () => {
		const initial = makeData({ tasks: [makeTask({ id: "t1" })], releases: [makeRelease("a1", ORG_A.id)] });
		const ignored: ServerEventMessage[] = [
			{ type: "PING", scope: "INDIVIDUAL" },
			{ type: "CONNECTION_STATUS", scope: "INDIVIDUAL", data: { status: "ok", authenticated: true, clientId: "c" } },
			// The releases room also carries these; both are ids only and the board shows neither.
			roomMessage("UPDATE_RELEASE_STATUS_UPDATES", { releaseId: "a1" }),
			roomMessage("UPDATE_RELEASE_COMMENTS", { releaseId: "a1" }),
			roomMessage("UPDATE_TASK_COMMENTS", { id: "t1" }),
			{ type: "UPDATE_VIEWS", scope: "INDIVIDUAL", data: [], meta: { ts: 1, orgId: ORG_A.id } },
		];

		for (const event of ignored) {
			expect(applyLanderEvent(initial, event, context)).toBe(initial);
		}
	});
});

describe("isSseReconnectedMessage", () => {
	it("recognises the window message lib/serverEvents.ts posts after a reconnect", () => {
		expect(isSseReconnectedMessage({ type: "SSE_RECONNECTED" })).toBe(true);
	});

	it("tolerates any other window message", () => {
		expect(isSseReconnectedMessage({ type: "timeline-update", payload: "t1" })).toBe(false);
		expect(isSseReconnectedMessage("SSE_RECONNECTED")).toBe(false);
		expect(isSseReconnectedMessage(null)).toBe(false);
		expect(isSseReconnectedMessage(undefined)).toBe(false);
	});
});

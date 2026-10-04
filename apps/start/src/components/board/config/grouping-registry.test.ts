import { describe, expect, it } from "vitest";
import {
	type BoardGroupingDefinition,
	bucketByAssignee,
	bucketByCategory,
	bucketByOrg,
	bucketByRelease,
	bucketByValue,
	createGroupingRegistry,
	getCategoryDropPatch,
	getPriorityDropPatch,
	getReleaseDropPatch,
	getStatusDropPatch,
	hasMultiMembership,
	NO_ORG_GROUP_ID,
	NO_RELEASE_GROUP_ID,
	omitCompletedStatuses,
	resolveEffectiveSubGrouping,
	resolveGroupingDefinition,
	UNASSIGNED_GROUP_ID,
	UNCATEGORIZED_GROUP_ID,
} from "./grouping-registry";

function definition(id: string, overrides: Partial<BoardGroupingDefinition> = {}): BoardGroupingDefinition {
	return { id, label: id, icon: null, persistable: true, group: () => [], ...overrides };
}

describe("registry", () => {
	const status = definition("status");
	const assignee = definition("assignee", { multiMembership: true });
	const none = definition("none", { canSubGroup: false, persistable: false });
	const registry = createGroupingRegistry([status, assignee, none]);

	it("merges later lists over earlier ones by id, keeping order of first registration", () => {
		const override = definition("status", { label: "Roadmap status", ownsMembership: true });
		const roadmap = definition("roadmap-release");
		const merged = createGroupingRegistry([status, assignee], [override, roadmap], undefined);
		expect(Array.from(merged.keys())).toEqual(["status", "assignee", "roadmap-release"]);
		expect(merged.get("status")).toBe(override);
	});

	it("falls back to status for unknown, null and undefined ids", () => {
		expect(resolveGroupingDefinition(registry, "assignee")).toBe(assignee);
		expect(resolveGroupingDefinition(registry, "stale-id")).toBe(status);
		expect(resolveGroupingDefinition(registry, null)).toBe(status);
		expect(resolveGroupingDefinition(registry, undefined)).toBe(status);
	});

	it("throws when the fallback itself is missing", () => {
		expect(() => resolveGroupingDefinition(createGroupingRegistry([assignee]), "x")).toThrow();
	});

	it("ignores the sub-grouping when it is none/absent or the primary can't be sub-grouped", () => {
		expect(resolveEffectiveSubGrouping(registry, "status", "assignee")).toBe("assignee");
		expect(resolveEffectiveSubGrouping(registry, "status", "none")).toBe("none");
		expect(resolveEffectiveSubGrouping(registry, "status", undefined)).toBe("none");
		expect(resolveEffectiveSubGrouping(registry, "none", "assignee")).toBe("none");
	});

	it("reports multi-membership for the primary or the effective sub-grouping", () => {
		expect(hasMultiMembership(registry, "assignee", "none")).toBe(true);
		expect(hasMultiMembership(registry, "status", "assignee")).toBe(true);
		expect(hasMultiMembership(registry, "status", "none")).toBe(false);
		// "none" can't be sub-grouped, so its (ignored) sub-grouping can't make it multi-membership.
		expect(hasMultiMembership(registry, "none", "assignee")).toBe(false);
	});
});

describe("bucketByValue / omitCompletedStatuses", () => {
	const keys = ["backlog", "todo", "in-progress", "done", "canceled"] as const;

	it("drops done and canceled only when completed tasks are hidden", () => {
		expect(omitCompletedStatuses(keys, false)).toEqual(["backlog", "todo", "in-progress"]);
		expect(omitCompletedStatuses(keys, true)).toEqual([...keys]);
	});

	it("emits every key in order, empty ones included, keeping input order within a bucket", () => {
		const items = [
			{ id: "a", status: "done" },
			{ id: "b", status: "todo" },
			{ id: "c", status: "done" },
			{ id: "d", status: "unknown" },
		];
		const buckets = bucketByValue(items, keys, (item) => item.status);
		expect(buckets.map((bucket) => bucket.id)).toEqual([...keys]);
		expect(buckets.find((bucket) => bucket.id === "done")?.items.map((item) => item.id)).toEqual(["a", "c"]);
		expect(buckets.find((bucket) => bucket.id === "backlog")?.items).toEqual([]);
		expect(buckets.flatMap((bucket) => bucket.items.map((item) => item.id))).not.toContain("d");
	});
});

describe("bucketByAssignee", () => {
	const ann = { id: "u-ann", name: "Ann" };
	const bob = { id: "u-bob", name: "Bob" };

	it("lists assignees in first-seen order and ends with Unassigned", () => {
		const items = [
			{ id: "t1", assignees: [bob] },
			{ id: "t2", assignees: [ann] },
			{ id: "t3", assignees: [] },
		];
		expect(bucketByAssignee(items).map((bucket) => bucket.id)).toEqual(["u-bob", "u-ann", UNASSIGNED_GROUP_ID]);
	});

	it("puts a multi-assignee item in every one of its assignees' buckets", () => {
		const items = [{ id: "t1", assignees: [ann, bob] }];
		const buckets = bucketByAssignee(items);
		expect(buckets.filter((bucket) => bucket.items.length > 0).map((bucket) => bucket.id)).toEqual([
			"u-ann",
			"u-bob",
		]);
	});

	it("keeps the Unassigned bucket even when empty", () => {
		const buckets = bucketByAssignee([{ id: "t1", assignees: [ann] }]);
		expect(buckets.map((bucket) => bucket.label)).toEqual(["Ann", "Unassigned"]);
		expect(buckets.at(-1)?.items).toEqual([]);
	});
});

describe("bucketByCategory / bucketByRelease", () => {
	const categories = [
		{ id: "c1", name: "Bug", color: "#f00" },
		{ id: "c2", name: "Idea", color: null },
	];
	const releases = [{ id: "r1", name: "v1", color: "#00f" }];

	it("emits categories in order with their colors, then Uncategorized for none/unknown", () => {
		const items = [
			{ id: "a", category: "c2" },
			{ id: "b", category: null },
			{ id: "c", category: "gone" },
			{ id: "d", category: "c1" },
		];
		const buckets = bucketByCategory(items, categories);
		expect(buckets.map((bucket) => bucket.id)).toEqual(["c1", "c2", UNCATEGORIZED_GROUP_ID]);
		expect(buckets.map((bucket) => bucket.color)).toEqual(["#f00", undefined, undefined]);
		expect(buckets[2]?.items.map((item) => item.id)).toEqual(["b", "c"]);
	});

	it("emits releases in order, then No release for none/unknown", () => {
		const items = [
			{ id: "a", releaseId: "r1" },
			{ id: "b", releaseId: undefined },
			{ id: "c", releaseId: "gone" },
		];
		const buckets = bucketByRelease(items, releases);
		expect(buckets.map((bucket) => bucket.id)).toEqual(["r1", NO_RELEASE_GROUP_ID]);
		expect(buckets[0]?.items.map((item) => item.id)).toEqual(["a"]);
		expect(buckets[1]?.items.map((item) => item.id)).toEqual(["b", "c"]);
	});
});

describe("bucketByOrg", () => {
	const orgA = { id: "o-a", name: "Acme", logo: null };
	const orgB = { id: "o-b", name: "Beta", logo: "https://cdn/b.png" };

	it("groups by organization in first-seen order and carries the logo", () => {
		const items = [
			{ id: "1", organizationId: "o-b", organization: orgB },
			{ id: "2", organizationId: "o-a", organization: orgA },
			{ id: "3", organizationId: "o-b", organization: orgB },
		];
		const buckets = bucketByOrg(items);
		expect(buckets.map((bucket) => bucket.id)).toEqual(["o-b", "o-a"]);
		expect(buckets[0]?.items.map((item) => item.id)).toEqual(["1", "3"]);
		expect(buckets[0]?.logo).toBe("https://cdn/b.png");
		expect(buckets.every((bucket) => bucket.isKnownOrg)).toBe(true);
	});

	it("adds No organization only when some item lacks its organization snapshot", () => {
		const withOrg = [{ id: "1", organizationId: "o-a", organization: orgA }];
		expect(bucketByOrg(withOrg).map((bucket) => bucket.id)).toEqual(["o-a"]);

		const buckets = bucketByOrg([...withOrg, { id: "2", organizationId: "o-z", organization: null }]);
		expect(buckets.map((bucket) => bucket.id)).toEqual(["o-a", NO_ORG_GROUP_ID]);
		expect(buckets[1]?.isKnownOrg).toBe(false);
		expect(buckets[1]?.items.map((item) => item.id)).toEqual(["2"]);
	});
});

describe("drop patches", () => {
	it("status and priority patch only when the value changes", () => {
		expect(getStatusDropPatch({ status: "todo" }, "done")).toEqual({ status: "done" });
		expect(getStatusDropPatch({ status: "todo" }, "todo")).toBeNull();
		expect(getPriorityDropPatch({ priority: "low" }, "urgent")).toEqual({ priority: "urgent" });
		expect(getPriorityDropPatch({ priority: "low" }, "low")).toBeNull();
	});

	const categories = [
		{ id: "c1", organizationId: "o-a" },
		{ id: "c2", organizationId: "o-b" },
	];

	it("category: clears on Uncategorized, assigns a same-org category, refuses cross-org/unknown/no-op", () => {
		expect(
			getCategoryDropPatch({ category: "c1", organizationId: "o-a" }, UNCATEGORIZED_GROUP_ID, categories)
		).toEqual({
			category: null,
		});
		expect(
			getCategoryDropPatch({ category: null, organizationId: "o-a" }, UNCATEGORIZED_GROUP_ID, categories)
		).toBeNull();
		expect(getCategoryDropPatch({ category: null, organizationId: "o-a" }, "c1", categories)).toEqual({
			category: "c1",
		});
		expect(getCategoryDropPatch({ category: "c1", organizationId: "o-a" }, "c1", categories)).toBeNull();
		expect(getCategoryDropPatch({ category: null, organizationId: "o-a" }, "c2", categories)).toBeNull();
		expect(getCategoryDropPatch({ category: null, organizationId: "o-a" }, "missing", categories)).toBeNull();
	});

	const releases = [
		{ id: "r1", organizationId: "o-a" },
		{ id: "r2", organizationId: "o-b" },
	];

	it("release: clears on No release, assigns a same-org release, refuses cross-org/unknown/no-op", () => {
		expect(getReleaseDropPatch({ releaseId: "r1", organizationId: "o-a" }, NO_RELEASE_GROUP_ID, releases)).toEqual({
			releaseId: null,
		});
		expect(getReleaseDropPatch({ releaseId: null, organizationId: "o-a" }, NO_RELEASE_GROUP_ID, releases)).toBeNull();
		expect(getReleaseDropPatch({ releaseId: null, organizationId: "o-a" }, "r1", releases)).toEqual({
			releaseId: "r1",
		});
		expect(getReleaseDropPatch({ releaseId: "r1", organizationId: "o-a" }, "r1", releases)).toBeNull();
		expect(getReleaseDropPatch({ releaseId: null, organizationId: "o-a" }, "r2", releases)).toBeNull();
		expect(getReleaseDropPatch({ releaseId: null, organizationId: "o-a" }, "missing", releases)).toBeNull();
	});
});

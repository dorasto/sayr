import { describe, expect, it } from "vitest";
import type { ReleaseItem } from "./release-board-model";
import { formatAttentionReason, selectNeedsAttention, selectRecentlyShipped, selectUpNext } from "./release-overview";

const NOW = new Date("2026-10-29T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function release(id: string, overrides: Partial<ReleaseItem> = {}): ReleaseItem {
	return {
		id,
		organizationId: "org",
		name: id,
		slug: id,
		description: null,
		status: "planned",
		targetDate: null,
		releasedAt: null,
		color: null,
		icon: null,
		leadId: null,
		createdBy: null,
		createdAt: null,
		updatedAt: null,
		...overrides,
	} as ReleaseItem;
}

describe("selectUpNext", () => {
	it("lists open releases by target date, undated last with in-progress first", () => {
		const releases = [
			release("late", { targetDate: new Date("2026-12-01") }),
			release("shipped", { status: "released", targetDate: new Date("2026-01-01") }),
			release("undated-planned"),
			release("soon", { status: "in-progress", targetDate: new Date("2026-11-01") }),
			release("undated-wip", { status: "in-progress" }),
		];
		expect(selectUpNext(releases, 5).map((r) => r.id)).toEqual(["soon", "late", "undated-wip", "undated-planned"]);
		expect(selectUpNext(releases, 2).map((r) => r.id)).toEqual(["soon", "late"]);
	});
});

describe("selectRecentlyShipped", () => {
	it("lists released releases, newest first", () => {
		const releases = [
			release("old", { status: "released", releasedAt: new Date("2026-01-01") }),
			release("open"),
			release("new", { status: "released", releasedAt: new Date("2026-06-01") }),
		];
		expect(selectRecentlyShipped(releases).map((r) => r.id)).toEqual(["new", "old"]);
	});
});

describe("selectNeedsAttention", () => {
	it("flags bad health on open releases and silent in-progress ones, worst first", () => {
		const releases = [
			release("risk", { status: "planned" }),
			release("off", { status: "in-progress" }),
			release("silent", { status: "in-progress" }),
			release("quiet", { status: "in-progress" }),
			release("fresh", { status: "in-progress" }),
			release("planned-no-updates"),
			release("shipped-off", { status: "released" }),
		];
		const latest = {
			risk: { health: "at_risk" as const, createdAt: daysAgo(1) },
			off: { health: "off_track" as const, createdAt: daysAgo(1) },
			quiet: { health: "on_track" as const, createdAt: daysAgo(22) },
			fresh: { health: "on_track" as const, createdAt: daysAgo(3) },
			"shipped-off": { health: "off_track" as const, createdAt: daysAgo(1) },
		};
		const items = selectNeedsAttention(releases, latest, NOW);
		expect(items.map((i) => [i.release.id, formatAttentionReason(i.reason)])).toEqual([
			["off", "Off track"],
			["risk", "At risk"],
			["silent", "No updates"],
			["quiet", "No update 3w"],
		]);
	});
});

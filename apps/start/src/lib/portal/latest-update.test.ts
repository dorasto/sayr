import { describe, expect, it } from "vitest";
import { getLatestUpdate, type UpdateCandidate } from "./latest-update";

const organization = { members: [{ user: { id: "team1" } }, { user: { id: "team2" } }] };

const comment = (
	id: string,
	createdAt: string,
	overrides: Partial<UpdateCandidate> = {}
): UpdateCandidate & { id: string } => ({
	id,
	createdAt,
	visibility: "public",
	parentId: null,
	createdBy: { id: "team1" },
	...overrides,
});

describe("getLatestUpdate", () => {
	it("picks the newest top-level public comment by a team member", () => {
		const comments = [
			comment("old", "2026-09-01T00:00:00Z"),
			comment("new", "2026-09-28T00:00:00Z", { createdBy: { id: "team2" } }),
			comment("middle", "2026-09-10T00:00:00Z"),
		];
		expect(getLatestUpdate(comments, organization)?.id).toBe("new");
	});

	it("ignores replies, internal comments, non-team authors and GitHub comments", () => {
		const comments = [
			comment("team-old", "2026-09-01T00:00:00Z"),
			comment("reply", "2026-09-30T00:00:00Z", { parentId: "team-old" }),
			comment("internal", "2026-09-30T00:00:00Z", { visibility: "internal" }),
			comment("guest", "2026-09-30T00:00:00Z", { createdBy: { id: "guest" } }),
			comment("github", "2026-09-30T00:00:00Z", { createdBy: null }),
		];
		expect(getLatestUpdate(comments, organization)?.id).toBe("team-old");
	});

	it("returns null when there is no qualifying comment", () => {
		expect(getLatestUpdate([], organization)).toBeNull();
		expect(getLatestUpdate(undefined, organization)).toBeNull();
		expect(
			getLatestUpdate([comment("guest", "2026-09-30T00:00:00Z", { createdBy: { id: "guest" } })], organization)
		).toBeNull();
	});
});

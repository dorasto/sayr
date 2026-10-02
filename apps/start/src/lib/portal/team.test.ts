import { describe, expect, it } from "vitest";
import { findTeamMemberUser, isTeamMember } from "./team";

const organization = { members: [{ user: { id: "u1", name: "Tom" } }, { user: { id: "u2", name: "Priya" } }] };

describe("isTeamMember", () => {
	it("matches on organization.members[].user.id", () => {
		expect(isTeamMember("u1", organization)).toBe(true);
		expect(isTeamMember("u3", organization)).toBe(false);
	});

	it("is false for guests and empty orgs", () => {
		expect(isTeamMember(null, organization)).toBe(false);
		expect(isTeamMember(undefined, organization)).toBe(false);
		expect(isTeamMember("", organization)).toBe(false);
		expect(isTeamMember("u1", { members: [] })).toBe(false);
	});
});

describe("findTeamMemberUser", () => {
	it("returns the member's user or null", () => {
		expect(findTeamMemberUser("u2", organization)?.name).toBe("Priya");
		expect(findTeamMemberUser("nope", organization)).toBeNull();
		expect(findTeamMemberUser(null, organization)).toBeNull();
	});
});

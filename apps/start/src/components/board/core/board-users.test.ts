import { describe, expect, it } from "vitest";
import { deriveAssignableUsers, deriveFilterUsers } from "./board-users";

const user = (id: string) => ({ id, name: `User ${id}`, image: null });

describe("deriveAssignableUsers", () => {
	const items = [
		{ organizationId: "a", assignees: [user("1"), user("2")] },
		{ organizationId: "a", assignees: [user("2"), user("3")] },
		{ organizationId: "b", assignees: [user("9")] },
	];

	it("collects distinct assignees from the given org only", () => {
		expect(deriveAssignableUsers(items, "a").map((u) => u.id)).toEqual(["1", "2", "3"]);
		expect(deriveAssignableUsers(items, "b").map((u) => u.id)).toEqual(["9"]);
	});

	it("returns nothing for an org with no items", () => {
		expect(deriveAssignableUsers(items, "zzz")).toEqual([]);
	});
});

describe("deriveFilterUsers", () => {
	it("collects distinct assignees and creators across every item", () => {
		const users = deriveFilterUsers([
			{ assignees: [user("1")], createdBy: user("2") },
			{ assignees: [user("1"), user("3")], createdBy: null },
			{ assignees: [] },
		]);
		expect(users.map((u) => u.id).sort()).toEqual(["1", "2", "3"]);
	});
});

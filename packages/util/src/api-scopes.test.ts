import { describe, expect, it } from "vitest";
import {
	ALL_API_KEY_SCOPES,
	API_KEY_SCOPES,
	invalidScopes,
	isApiKeyScope,
	keyScopeAllows,
	parseScope,
	parseScopeRecord,
	recordToScopes,
	scopesToRecord,
	scopeToPermissionPath,
} from "./api-scopes";

describe("isApiKeyScope / parseScope", () => {
	it("accepts every scope actually in the catalog", () => {
		for (const scope of ALL_API_KEY_SCOPES) {
			expect(isApiKeyScope(scope)).toBe(true);
		}
	});

	it("rejects unknown scopes", () => {
		expect(isApiKeyScope("tasks.deleteAll")).toBe(false);
		expect(isApiKeyScope("admin.manageMembers")).toBe(false);
		expect(isApiKeyScope("")).toBe(false);
	});

	it("never exposes an admin.* scope, even if someone adds one to the catalog shape", () => {
		// Regression guard for the exact security property this catalog exists to
		// enforce — see API_KEY_SCOPES's doc comment.
		expect(Object.keys(API_KEY_SCOPES)).not.toContain("admin");
		expect(ALL_API_KEY_SCOPES.some((s) => s.startsWith("admin."))).toBe(false);
	});

	it("parseScope splits a valid scope into resource/action", () => {
		expect(parseScope("tasks.create")).toEqual({ resource: "tasks", action: "create" });
	});

	it("parseScope returns null for an unknown scope", () => {
		expect(parseScope("tasks.nonexistent")).toBeNull();
	});
});

describe("invalidScopes", () => {
	it("returns only the entries not in the catalog", () => {
		expect(invalidScopes(["tasks.create", "bogus.scope", "tasks.read"])).toEqual(["bogus.scope"]);
	});

	it("returns an empty array when everything is valid", () => {
		expect(invalidScopes(["tasks.create", "tasks.read"])).toEqual([]);
	});
});

describe("scopeToPermissionPath", () => {
	it("maps a scope to its underlying org permission", () => {
		expect(scopeToPermissionPath("tasks.create")).toBe("tasks.create");
		// tasks.comment deliberately maps to the lower "members" bar, not its own
		// permission path — see the catalog's own comment on why.
		expect(scopeToPermissionPath("tasks.comment")).toBe("members");
		expect(scopeToPermissionPath("tasks.read")).toBe("members");
	});
});

describe("scopesToRecord / recordToScopes round-trip", () => {
	it("round-trips a valid scope list", () => {
		const scopes: Parameters<typeof scopesToRecord>[0] = ["tasks.create", "tasks.comment", "content.manageLabels"];
		const record = scopesToRecord(scopes);
		expect(record).toEqual({ tasks: ["create", "comment"], content: ["manageLabels"] });
		expect(recordToScopes(record).sort()).toEqual([...scopes].sort());
	});

	it("drops unknown scopes rather than passing them through", () => {
		const record = scopesToRecord(["tasks.create", "not.a.real.scope", "bogus"]);
		expect(record).toEqual({ tasks: ["create"] });
	});

	it("recordToScopes drops unknown resource/action pairs instead of widening access", () => {
		expect(recordToScopes({ tasks: ["create", "haxx0r"], admin: ["manageMembers"] })).toEqual(["tasks.create"]);
	});

	it("recordToScopes tolerates malformed input without throwing", () => {
		expect(recordToScopes(null)).toEqual([]);
		expect(recordToScopes(undefined)).toEqual([]);
		// biome-ignore lint/suspicious/noExplicitAny: intentionally malformed input for the test
		expect(recordToScopes({ tasks: "create" } as any)).toEqual([]);
	});
});

describe("keyScopeAllows", () => {
	it("allows a scope actually present in the record", () => {
		expect(keyScopeAllows({ tasks: ["create", "comment"] }, "tasks.create")).toBe(true);
	});

	it("denies a scope not present in the record", () => {
		expect(keyScopeAllows({ tasks: ["comment"] }, "tasks.create")).toBe(false);
	});

	it("denies everything when the record is null or missing — null must never mean unrestricted", () => {
		expect(keyScopeAllows(null, "tasks.create")).toBe(false);
		expect(keyScopeAllows(undefined, "tasks.create")).toBe(false);
	});

	it("denies a resource bucket that isn't an array", () => {
		// biome-ignore lint/suspicious/noExplicitAny: intentionally malformed input for the test
		expect(keyScopeAllows({ tasks: "create" } as any, "tasks.create")).toBe(false);
	});
});

describe("parseScopeRecord", () => {
	it("parses a well-formed JSON permissions string", () => {
		expect(parseScopeRecord('{"tasks":["create","read"]}')).toEqual({ tasks: ["create", "read"] });
	});

	it("returns null for empty/missing input", () => {
		expect(parseScopeRecord(null)).toBeNull();
		expect(parseScopeRecord(undefined)).toBeNull();
		expect(parseScopeRecord("")).toBeNull();
	});

	it("returns null (never throws) on malformed JSON — a corrupt column must grant nothing", () => {
		expect(parseScopeRecord("{not valid json")).toBeNull();
	});

	it("returns null for a JSON value that isn't a plain object", () => {
		expect(parseScopeRecord("[1,2,3]")).toBeNull();
		expect(parseScopeRecord('"just a string"')).toBeNull();
		expect(parseScopeRecord("42")).toBeNull();
	});
});

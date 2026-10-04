import { describe, expect, it } from "vitest";
import { parseGithubIssueUrl } from "./github-issue";

describe("parseGithubIssueUrl", () => {
	it("reads the repo and issue number", () => {
		expect(parseGithubIssueUrl("https://github.com/dorasto/sayr/issues/203")).toEqual({
			repo: "dorasto/sayr",
			number: 203,
		});
	});

	it("accepts pull request URLs and trailing paths", () => {
		expect(parseGithubIssueUrl("https://github.com/dorasto/sayr/pull/12#issuecomment-1")).toEqual({
			repo: "dorasto/sayr",
			number: 12,
		});
	});

	it("returns null for anything else", () => {
		expect(parseGithubIssueUrl("https://example.com/foo/bar/issues/1")).toBeNull();
		expect(parseGithubIssueUrl("https://github.com/dorasto/sayr")).toBeNull();
	});
});

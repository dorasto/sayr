import { describe, expect, it } from "vitest";
import { getOrgSlugFromPath, getPortalSection, hidesMobileTabBar } from "./nav";

describe("getOrgSlugFromPath", () => {
	it("reads the slug after /orgs/", () => {
		expect(getOrgSlugFromPath("/orgs/acme")).toBe("acme");
		expect(getOrgSlugFromPath("/orgs/acme/roadmap")).toBe("acme");
		expect(getOrgSlugFromPath("/somewhere/else")).toBe("");
	});
});

describe("getPortalSection", () => {
	it("treats the board, posts and the new post form as Feedback", () => {
		expect(getPortalSection("/orgs/acme", "acme")).toBe("feedback");
		expect(getPortalSection("/orgs/acme/", "acme")).toBe("feedback");
		expect(getPortalSection("/orgs/acme/123", "acme")).toBe("feedback");
		expect(getPortalSection("/orgs/acme/new", "acme")).toBe("feedback");
	});

	it("maps roadmap, releases and activity (and their children)", () => {
		expect(getPortalSection("/orgs/acme/roadmap", "acme")).toBe("roadmap");
		expect(getPortalSection("/orgs/acme/releases", "acme")).toBe("changelog");
		expect(getPortalSection("/orgs/acme/releases/0.7.0", "acme")).toBe("changelog");
		expect(getPortalSection("/orgs/acme/activity/", "acme")).toBe("activity");
	});

	it("does not match a path that merely starts with a section name", () => {
		expect(getPortalSection("/orgs/acme/roadmapping", "acme")).toBe("feedback");
	});
});

describe("hidesMobileTabBar", () => {
	it("hides on post pages and the new post form", () => {
		expect(hidesMobileTabBar("/orgs/acme/123", "acme")).toBe(true);
		expect(hidesMobileTabBar("/orgs/acme/123/", "acme")).toBe(true);
		expect(hidesMobileTabBar("/orgs/acme/new", "acme")).toBe(true);
	});

	it("keeps the bar on the other pages", () => {
		expect(hidesMobileTabBar("/orgs/acme", "acme")).toBe(false);
		expect(hidesMobileTabBar("/orgs/acme/roadmap", "acme")).toBe(false);
		expect(hidesMobileTabBar("/orgs/acme/releases", "acme")).toBe(false);
		expect(hidesMobileTabBar("/orgs/acme/releases/0.7.0", "acme")).toBe(false);
		expect(hidesMobileTabBar("/orgs/acme/activity", "acme")).toBe(false);
	});
});

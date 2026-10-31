import { describe, expect, it } from "vitest";
import { resolveActiveSidebarItem, type SidebarTarget } from "./sidebar-active";

const targets: SidebarTarget[] = [
	{ id: "nav:/home", pathname: "/home" },
	{ id: "org:a:tasks", pathname: "/a/tasks" },
	{ id: "org:a:releases", pathname: "/a/releases", prefix: true },
	{ id: "org:a:view:bugs", pathname: "/a/tasks", view: "bugs" },
	{ id: "fav:1", pathname: "/a/tasks", view: "bugs" },
	{ id: "fav:2", pathname: "/home", view: "mine" },
];

describe("resolveActiveSidebarItem", () => {
	it("prefers the row opening the exact view over its page's row", () => {
		expect(resolveActiveSidebarItem(targets, { pathname: "/home", view: "mine" })).toBe("fav:2");
		expect(resolveActiveSidebarItem(targets, { pathname: "/a/tasks", view: "bugs" })).toBe("org:a:view:bugs");
	});

	it("falls back to the page's row for a view with no row of its own", () => {
		expect(resolveActiveSidebarItem(targets, { pathname: "/home", view: "unpinned" })).toBe("nav:/home");
		expect(resolveActiveSidebarItem(targets, { pathname: "/a/tasks" })).toBe("org:a:tasks");
	});

	it("keeps the clicked row while the page still matches it", () => {
		expect(resolveActiveSidebarItem(targets, { pathname: "/a/tasks", view: "bugs" }, "fav:1")).toBe("fav:1");
	});

	it("ignores a clicked row the page no longer matches", () => {
		expect(resolveActiveSidebarItem(targets, { pathname: "/a/tasks" }, "fav:1")).toBe("org:a:tasks");
	});

	it("matches pages below a prefix row, and nothing elsewhere", () => {
		expect(resolveActiveSidebarItem(targets, { pathname: "/a/releases/v1" })).toBe("org:a:releases");
		expect(resolveActiveSidebarItem(targets, { pathname: "/settings" })).toBeUndefined();
	});
});

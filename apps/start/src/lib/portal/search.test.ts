import { describe, expect, it } from "vitest";
import {
	filterReleases,
	getSearchShortcut,
	getSearchTerms,
	includesGroup,
	mergePostResults,
	normalizeSearchQuery,
	rankPopularPosts,
	type SearchPostLike,
	type SearchShortcutEvent,
	scorePost,
	splitHighlight,
	wrapIndex,
} from "./search";

const keyOf = (post: SearchPostLike) => `SAY-${post.shortId}`;

const post = (id: string, shortId: number, title: string, voteCount = 0, status = "backlog"): SearchPostLike => ({
	id,
	shortId,
	title,
	voteCount,
	status,
});

describe("normalizeSearchQuery / getSearchTerms", () => {
	it("trims and collapses whitespace", () => {
		expect(normalizeSearchQuery("  dark   mode \n")).toBe("dark mode");
		expect(normalizeSearchQuery("   ")).toBe("");
	});

	it("caps the length", () => {
		expect(normalizeSearchQuery("a".repeat(500))).toHaveLength(200);
	});

	it("returns unique lower-cased terms, longest first", () => {
		expect(getSearchTerms("Dark MODE dark")).toEqual(["dark", "mode"]);
		expect(getSearchTerms("a notification")).toEqual(["notification", "a"]);
		expect(getSearchTerms("")).toEqual([]);
	});
});

describe("splitHighlight", () => {
	it("flags the matching runs case-insensitively", () => {
		expect(splitHighlight("Notification system overhaul", "notif")).toEqual([
			{ text: "Notif", match: true },
			{ text: "ication system overhaul", match: false },
		]);
	});

	it("highlights every word of the query", () => {
		expect(splitHighlight("Slack notifications", "notif slack")).toEqual([
			{ text: "Slack", match: true },
			{ text: " ", match: false },
			{ text: "notif", match: true },
			{ text: "ications", match: false },
		]);
	});

	it("returns the text untouched without a query or a match", () => {
		expect(splitHighlight("Dark mode", "")).toEqual([{ text: "Dark mode", match: false }]);
		expect(splitHighlight("Dark mode", "zzz")).toEqual([{ text: "Dark mode", match: false }]);
		expect(splitHighlight("", "dark")).toEqual([]);
	});

	it("treats regex characters in the query literally", () => {
		expect(splitHighlight("Support (beta) [x]", "(beta")).toEqual([
			{ text: "Support ", match: false },
			{ text: "(beta", match: true },
			{ text: ") [x]", match: false },
		]);
		expect(splitHighlight("anything", ".*")).toEqual([{ text: "anything", match: false }]);
	});
});

describe("scorePost", () => {
	const dark = post("1", 12, "Dark mode for the dashboard");

	it("ranks key matches highest", () => {
		expect(scorePost(dark, "SAY-12", "SAY-12")).toBe(100);
		expect(scorePost(dark, "say-12", "SAY-12")).toBe(100);
		expect(scorePost(dark, "12", "SAY-12")).toBe(100);
	});

	it("scores prefix, word-start and substring matches in that order", () => {
		const prefix = scorePost(dark, "dark mo", "SAY-12");
		const wordStart = scorePost(dark, "dash", "SAY-12");
		const inside = scorePost(dark, "board", "SAY-12");
		expect(prefix).toBe(80);
		expect(wordStart).toBe(60);
		expect(inside).toBe(40);
	});

	it("requires every word to match", () => {
		expect(scorePost(dark, "dark light", "SAY-12")).toBe(0);
		expect(scorePost(dark, "", "SAY-12")).toBe(0);
	});
});

describe("mergePostResults", () => {
	const a = post("a", 1, "Notification system overhaul", 3);
	const b = post("b", 2, "Slack notifications for status changes", 12);
	const c = post("c", 3, "Email digest", 9);
	const d = post("d", 4, "Notifications in email", 1);

	it("ranks by match quality then votes, de-duplicating cached against server", () => {
		const result = mergePostResults({ query: "notif", cached: [a, d], server: [b, a], serverIsFresh: true, keyOf });
		expect(result.map((p) => p.id)).toEqual(["a", "d", "b"]);
	});

	it("keeps server hits that don't match the title when the server rows are fresh (description matches)", () => {
		const result = mergePostResults({ query: "notif", cached: [], server: [c], serverIsFresh: true, keyOf });
		expect(result.map((p) => p.id)).toEqual(["c"]);
	});

	it("drops stale server rows that no longer match while the next response is loading", () => {
		const result = mergePostResults({ query: "notif", cached: [], server: [b, c], serverIsFresh: false, keyOf });
		expect(result.map((p) => p.id)).toEqual(["b"]);
	});

	it("only includes cached posts that match", () => {
		const result = mergePostResults({ query: "digest", cached: [a, b, c], server: [], serverIsFresh: true, keyOf });
		expect(result.map((p) => p.id)).toEqual(["c"]);
	});

	it("respects the limit", () => {
		const many = Array.from({ length: 12 }, (_, i) => post(`p${i}`, i + 10, `Notification ${i}`, i));
		const result = mergePostResults({
			query: "notif",
			cached: many,
			server: [],
			serverIsFresh: true,
			keyOf,
			limit: 8,
		});
		expect(result).toHaveLength(8);
		expect(result[0]?.voteCount).toBe(11);
	});
});

describe("rankPopularPosts", () => {
	it("keeps open posts only, most voted first, de-duplicated across lists", () => {
		const open1 = post("1", 1, "One", 5);
		const open2 = post("2", 2, "Two", 9);
		const done = post("3", 3, "Three", 50, "done");
		const wontDo = post("4", 4, "Four", 40, "canceled");
		const result = rankPopularPosts(
			[
				[open1, done],
				[open2, open1, wontDo],
			],
			5
		);
		expect(result.map((p) => p.id)).toEqual(["2", "1"]);
	});

	it("honours the limit", () => {
		const posts = [post("1", 1, "One", 1), post("2", 2, "Two", 2), post("3", 3, "Three", 3)];
		expect(rankPopularPosts([posts], 2).map((p) => p.id)).toEqual(["3", "2"]);
	});
});

describe("filterReleases", () => {
	const releases = [
		{ name: "Notifications you control", slug: "0.7.0", status: "in-progress", targetDate: "2026-10-20" },
		{ name: "CLI and Paseo plugin", slug: "0.6.0", status: "released", releasedAt: "2026-09-22" },
		{ name: "Old stuff", slug: "0.1.0", status: "archived", releasedAt: "2025-01-01" },
		{ name: "Public API", slug: "0.5.0", status: "released", releasedAt: "2026-08-01" },
	];

	it("lists the latest non-archived releases when there is no query", () => {
		expect(filterReleases(releases, "", 3).map((r) => r.slug)).toEqual(["0.7.0", "0.6.0", "0.5.0"]);
	});

	it("matches on version or name", () => {
		expect(filterReleases(releases, "0.6", 5).map((r) => r.slug)).toEqual(["0.6.0"]);
		expect(filterReleases(releases, "notif", 5).map((r) => r.slug)).toEqual(["0.7.0"]);
	});

	it("never returns archived releases", () => {
		expect(filterReleases(releases, "old", 5)).toEqual([]);
		expect(filterReleases(releases, "0.1", 5)).toEqual([]);
	});
});

describe("includesGroup / wrapIndex", () => {
	it("maps filters to groups", () => {
		expect(includesGroup("all", "posts")).toBe(true);
		expect(includesGroup("all", "releases")).toBe(true);
		expect(includesGroup("posts", "releases")).toBe(false);
		expect(includesGroup("releases", "releases")).toBe(true);
	});

	it("wraps arrow-key movement", () => {
		expect(wrapIndex(0, -1, 4)).toBe(3);
		expect(wrapIndex(3, 1, 4)).toBe(0);
		expect(wrapIndex(1, 1, 4)).toBe(2);
		expect(wrapIndex(0, 1, 0)).toBe(0);
	});
});

describe("getSearchShortcut", () => {
	const base: SearchShortcutEvent = {
		key: "",
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		repeat: false,
		isComposing: false,
		defaultPrevented: false,
		targetIsEditable: false,
		targetInDialog: false,
	};

	it("toggles on Cmd+K and Ctrl+K, even while typing", () => {
		expect(getSearchShortcut({ ...base, key: "k", metaKey: true })).toBe("toggle");
		expect(getSearchShortcut({ ...base, key: "K", ctrlKey: true, targetIsEditable: true })).toBe("toggle");
	});

	it("opens on a bare slash only when not typing or inside another dialog", () => {
		expect(getSearchShortcut({ ...base, key: "/" })).toBe("open");
		expect(getSearchShortcut({ ...base, key: "/", targetIsEditable: true })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "/", targetInDialog: true })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "/", ctrlKey: true })).toBeNull();
	});

	it("ignores other keys, repeats, composition and handled events", () => {
		expect(getSearchShortcut({ ...base, key: "a" })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "k" })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "k", metaKey: true, repeat: true })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "/", isComposing: true })).toBeNull();
		expect(getSearchShortcut({ ...base, key: "/", defaultPrevented: true })).toBeNull();
	});
});

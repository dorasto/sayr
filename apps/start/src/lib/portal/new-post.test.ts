import type { NodeJSON } from "prosekit/core";
import { describe, expect, it } from "vitest";
import type { DuplicateCandidate } from "./duplicates";
import {
	docHasContent,
	isPostPriority,
	mergeSimilarPosts,
	type NewPostDraft,
	newPostDraftKey,
	parseDraft,
	resolveInitialDraft,
	serialiseDraft,
	splitCategoryChips,
	titleOnlyDraft,
} from "./new-post";

const category = (id: string, name: string) => ({ id, name });

describe("splitCategoryChips", () => {
	it("promotes Feature request, Bug and Feedback by name, in that order", () => {
		const categories = [
			category("1", "Docs"),
			category("2", "Feedback"),
			category("3", "Bug"),
			category("4", "Feature request"),
			category("5", "Other"),
		];
		const { chips, more } = splitCategoryChips(categories);
		expect(chips.map((c) => c.id)).toEqual(["4", "3", "2"]);
		expect(more.map((c) => c.id)).toEqual(["1", "5"]);
	});

	it("matches names case-insensitively and ignores a plural s", () => {
		const { chips } = splitCategoryChips([category("1", " BUGS "), category("2", "feature requests")]);
		expect(chips.map((c) => c.id)).toEqual(["2", "1"]);
	});

	it("tops up with the first remaining categories when a promoted name is missing", () => {
		const categories = [category("1", "Docs"), category("2", "Bug"), category("3", "UX"), category("4", "API")];
		const { chips, more } = splitCategoryChips(categories);
		expect(chips.map((c) => c.id)).toEqual(["2", "1", "3"]);
		expect(more.map((c) => c.id)).toEqual(["4"]);
	});

	it("uses the first three when none are promoted, and handles short lists", () => {
		const four = [category("1", "A"), category("2", "B"), category("3", "C"), category("4", "D")];
		expect(splitCategoryChips(four).chips.map((c) => c.id)).toEqual(["1", "2", "3"]);
		expect(splitCategoryChips(four.slice(0, 2))).toEqual({ chips: four.slice(0, 2), more: [] });
		expect(splitCategoryChips([])).toEqual({ chips: [], more: [] });
	});
});

const paragraph = (text: string): NodeJSON => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] });
const doc = (...content: NodeJSON[]): NodeJSON => ({ type: "doc", content });

describe("docHasContent", () => {
	it("is false for empty or whitespace-only documents", () => {
		expect(docHasContent(undefined)).toBe(false);
		expect(docHasContent(doc(paragraph("")))).toBe(false);
		expect(docHasContent(doc(paragraph("   ")))).toBe(false);
	});

	it("is true for text or media", () => {
		expect(docHasContent(doc(paragraph("hi")))).toBe(true);
		expect(docHasContent(doc({ type: "image", attrs: { src: "https://x/y.png" } }))).toBe(true);
	});
});

describe("draft serialise / parse", () => {
	const draft: NewPostDraft = {
		title: "Slack alerts",
		description: doc(paragraph("Details")),
		categoryId: "c1",
		priority: "high",
		labelIds: ["l1", "l2"],
		templateId: "t1",
	};

	it("keys drafts per org", () => {
		expect(newPostDraftKey("a")).not.toBe(newPostDraftKey("b"));
	});

	it("round-trips a draft", () => {
		const raw = serialiseDraft(draft);
		expect(raw).not.toBeNull();
		expect(parseDraft(raw)).toEqual(draft);
	});

	it("returns null for an empty draft so the key can be removed", () => {
		expect(serialiseDraft(titleOnlyDraft("  "))).toBeNull();
		expect(serialiseDraft({ ...titleOnlyDraft(""), description: doc(paragraph("")) })).toBeNull();
	});

	it("keeps a draft that only has a priority, labels or a template", () => {
		expect(serialiseDraft({ ...titleOnlyDraft(""), priority: "low" })).not.toBeNull();
		expect(serialiseDraft({ ...titleOnlyDraft(""), labelIds: ["l1"] })).not.toBeNull();
		expect(serialiseDraft({ ...titleOnlyDraft(""), templateId: "t1" })).not.toBeNull();
	});

	it("drops blob images, which do not survive a reload", () => {
		const withBlob = doc(paragraph("See"), { type: "image", attrs: { src: "blob:http://x/1" } });
		const parsed = parseDraft(serialiseDraft({ ...titleOnlyDraft("t"), description: withBlob }));
		expect(JSON.stringify(parsed?.description)).not.toContain("blob:");
		expect(JSON.stringify(parsed?.description)).toContain("See");
	});

	it("tolerates missing and corrupted storage", () => {
		expect(parseDraft(null)).toBeNull();
		expect(parseDraft("")).toBeNull();
		expect(parseDraft("{not json")).toBeNull();
		expect(parseDraft('"a string"')).toBeNull();
		expect(parseDraft("{}")).toBeNull();
	});

	it("ignores fields of the wrong type", () => {
		const parsed = parseDraft(JSON.stringify({ title: "ok", description: "nope", categoryId: 4 }));
		expect(parsed).toEqual(titleOnlyDraft("ok"));
	});

	it("falls back to defaults for an unknown priority and drops non-string label ids", () => {
		const parsed = parseDraft(
			JSON.stringify({ title: "ok", priority: "critical", labelIds: ["l1", 2, null], templateId: 3 })
		);
		expect(parsed).toEqual({ ...titleOnlyDraft("ok"), labelIds: ["l1"] });
		expect(parseDraft(JSON.stringify({ title: "ok", labelIds: "l1" }))?.labelIds).toEqual([]);
	});
});

describe("isPostPriority", () => {
	it("accepts the five priorities only", () => {
		for (const value of ["none", "low", "medium", "high", "urgent"]) expect(isPostPriority(value)).toBe(true);
		expect(isPostPriority("critical")).toBe(false);
		expect(isPostPriority(undefined)).toBe(false);
		expect(isPostPriority(1)).toBe(false);
	});
});

describe("resolveInitialDraft", () => {
	const stored: NewPostDraft = {
		...titleOnlyDraft("Slack alerts"),
		description: doc(paragraph("More")),
		categoryId: "c1",
		priority: "medium",
	};

	it("restores the stored draft when there is no prefill", () => {
		expect(resolveInitialDraft(undefined, stored)).toBe(stored);
		expect(resolveInitialDraft("  ", stored)).toBe(stored);
		expect(resolveInitialDraft(undefined, null)).toBeNull();
	});

	it("keeps the stored draft when the prefill is the same title", () => {
		expect(resolveInitialDraft("Slack alerts", stored)).toBe(stored);
	});

	it("starts fresh from a different prefilled title", () => {
		expect(resolveInitialDraft("Dark mode", stored)).toEqual(titleOnlyDraft("Dark mode"));
		expect(resolveInitialDraft("Dark mode", null)?.title).toBe("Dark mode");
	});
});

describe("mergeSimilarPosts", () => {
	const post = (id: string, title: string, voteCount = 0, status = "backlog"): DuplicateCandidate => ({
		id,
		title,
		status,
		voteCount,
	});

	it("returns nothing for a short title", () => {
		expect(mergeSimilarPosts("sl", [post("1", "Slack alerts")], [post("2", "Slack bot")])).toEqual([]);
	});

	it("dedupes by id across loaded and server results, keeping the loaded copy", () => {
		const loaded = [post("1", "Slack notifications", 5)];
		const server = [post("1", "Slack notifications", 99), post("2", "Slack bot", 1)];
		const merged = mergeSimilarPosts("slack alerts", loaded, server);
		expect(merged.map((p) => p.id).sort()).toEqual(["1", "2"]);
		expect(merged.find((p) => p.id === "1")?.voteCount).toBe(5);
	});

	it("appends server hits the scorer did not rate, after the scored ones", () => {
		const loaded = [post("1", "Slack notifications for status changes", 3)];
		const server = [post("2", "Webhooks overhaul", 10), post("3", "Another thing", 20)];
		const merged = mergeSimilarPosts("slack notifications", loaded, server);
		expect(merged.map((p) => p.id)).toEqual(["1", "3", "2"]);
	});

	it("leaves out canceled posts and caps the list", () => {
		const loaded = [
			post("1", "Slack alpha", 1),
			post("2", "Slack beta", 2),
			post("3", "Slack gamma", 3),
			post("4", "Slack delta", 4),
		];
		const server = [post("5", "Slack epsilon", 5, "canceled"), post("6", "Unscored", 50, "canceled")];
		const merged = mergeSimilarPosts("slack", loaded, server);
		expect(merged).toHaveLength(3);
		expect(merged.some((p) => p.status === "canceled")).toBe(false);
		expect(mergeSimilarPosts("slack", loaded, server, 10).map((p) => p.id)).toEqual(["4", "3", "2", "1"]);
	});
});

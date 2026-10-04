import { describe, expect, it } from "vitest";
import { findRelatedPosts, type RelatedCandidate } from "./related";

const post = (
	id: string,
	opts: { labels?: string[]; category?: string | null; voteCount?: number; status?: string } = {}
): RelatedCandidate => ({
	id,
	category: opts.category ?? null,
	labels: (opts.labels ?? []).map((label) => ({ id: label })),
	voteCount: opts.voteCount ?? 0,
	status: opts.status ?? "backlog",
});

describe("findRelatedPosts", () => {
	const source = post("self", { labels: ["a", "b"], category: "cat1" });

	it("ranks shared labels, then same category, then votes", () => {
		const candidates = [
			post("category-only", { category: "cat1", voteCount: 50 }),
			post("one-label", { labels: ["a"], voteCount: 1 }),
			post("two-labels", { labels: ["a", "b"], voteCount: 0 }),
			post("one-label-and-category", { labels: ["b"], category: "cat1", voteCount: 0 }),
		];
		expect(findRelatedPosts(source, candidates).map((t) => t.id)).toEqual([
			"two-labels",
			"one-label-and-category",
			"one-label",
		]);
	});

	it("excludes the post itself and canceled posts", () => {
		const candidates = [
			post("self", { labels: ["a"] }),
			post("canceled", { labels: ["a"], status: "canceled" }),
			post("ok", { labels: ["a"] }),
		];
		expect(findRelatedPosts(source, candidates).map((t) => t.id)).toEqual(["ok"]);
	});

	it("leaves out posts that share nothing and caps at three", () => {
		const candidates = [
			post("unrelated", { labels: ["z"], category: "other", voteCount: 100 }),
			...Array.from({ length: 5 }, (_, i) => post(`rel${i}`, { category: "cat1", voteCount: i })),
		];
		const result = findRelatedPosts(source, candidates);
		expect(result.map((t) => t.id)).toEqual(["rel4", "rel3", "rel2"]);
	});

	it("does not treat two uncategorised posts as the same category", () => {
		expect(findRelatedPosts(post("self"), [post("other")])).toEqual([]);
	});
});

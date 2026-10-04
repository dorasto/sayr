import { describe, expect, it } from "vitest";
import { type DuplicateCandidate, findDuplicates, getDuplicateWords } from "./duplicates";

const post = (id: string, title: string, voteCount = 0, status = "backlog"): DuplicateCandidate => ({
	id,
	title,
	status,
	voteCount,
});

describe("getDuplicateWords", () => {
	it("lowercases, drops short words and the stoplist", () => {
		expect(getDuplicateWords("Slack notifications for the status changes")).toEqual([
			"slack",
			"notifications",
			"status",
			"changes",
		]);
		expect(getDuplicateWords("It is a UI")).toEqual([]);
	});
});

describe("findDuplicates", () => {
	const posts = [
		post("1", "Slack notifications for status changes", 12),
		post("2", "Export tasks to CSV", 8),
		post("3", "Notification system overhaul", 3),
		post("4", "Slack integration", 20),
		post("5", "Won't do slack bot", 99, "canceled"),
	];

	it("requires a title of at least 3 characters", () => {
		expect(findDuplicates("", posts)).toEqual([]);
		expect(findDuplicates("sl", posts)).toEqual([]);
		expect(findDuplicates("   ab  ", posts)).toEqual([]);
	});

	it("matches on the first five characters of each word, scored by hits", () => {
		const result = findDuplicates("slack notifications", posts);
		expect(result.map((m) => m.task.id)).toEqual(["1", "4", "3"]);
		expect(result.map((m) => m.score)).toEqual([2, 1, 1]);
	});

	it("breaks score ties by vote count and excludes canceled posts", () => {
		const result = findDuplicates("slack", posts);
		expect(result.map((m) => m.task.id)).toEqual(["4", "1"]);
	});

	it("returns at most three matches", () => {
		const many = Array.from({ length: 6 }, (_, i) => post(String(i), `Dark mode option ${i}`, i));
		expect(findDuplicates("dark mode", many)).toHaveLength(3);
	});

	it("returns nothing when only stoplist words are typed", () => {
		expect(findDuplicates("when the", posts)).toEqual([]);
	});
});

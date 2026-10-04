import { describe, expect, it } from "vitest";
import {
	countUserPosts,
	getFirstParagraphText,
	getHealthPill,
	getNotesAfterLede,
	getReleaseTint,
	orderReleaseTasks,
	summarizeStatusUpdates,
} from "./release-page";

describe("getReleaseTint", () => {
	it("returns a picked colour", () => {
		expect(getReleaseTint("hsla(217, 91%, 60%, 1)")).toBe("hsla(217, 91%, 60%, 1)");
		expect(getReleaseTint("#3B82F6")).toBe("#3B82F6");
	});

	it("treats the black default and empty values as unset", () => {
		expect(getReleaseTint("hsla(0, 0%, 0%, 1)")).toBeNull();
		expect(getReleaseTint("  hsla(0,0%,0%,1) ")).toBeNull();
		expect(getReleaseTint("")).toBeNull();
		expect(getReleaseTint(null)).toBeNull();
	});
});

describe("getHealthPill", () => {
	it("relabels the health enum and omits unknown or missing values", () => {
		expect(getHealthPill("on_track")).toEqual({ label: "On track", tone: "ok" });
		expect(getHealthPill("at_risk")).toEqual({ label: "At risk", tone: "accent" });
		expect(getHealthPill("off_track")).toEqual({ label: "Off track", tone: "bad" });
		expect(getHealthPill(undefined)).toBeNull();
		expect(getHealthPill("mystery")).toBeNull();
	});
});

describe("orderReleaseTasks", () => {
	const tasks = [
		{ id: "done", status: "done", shortId: 1 },
		{ id: "backlog", status: "backlog", shortId: 2 },
		{ id: "todo", status: "todo", shortId: 3 },
		{ id: "progress-b", status: "in-progress", shortId: 5 },
		{ id: "progress-a", status: "in-progress", shortId: 4 },
		{ id: "wont", status: "canceled", shortId: 6 },
	];

	it("orders in progress, planned, done for an unreleased release and drops canceled", () => {
		expect(orderReleaseTasks(tasks, "in-progress").map((task) => task.id)).toEqual([
			"progress-a",
			"progress-b",
			"todo",
			"backlog",
			"done",
		]);
	});

	it("reverses the order once released", () => {
		expect(orderReleaseTasks(tasks, "released").map((task) => task.id)).toEqual([
			"done",
			"backlog",
			"todo",
			"progress-a",
			"progress-b",
		]);
	});

	it("does not mutate its input", () => {
		const copy = [...tasks];
		orderReleaseTasks(tasks, "planned");
		expect(tasks).toEqual(copy);
	});
});

describe("countUserPosts", () => {
	const organization = { members: [{ user: { id: "team-1" } }, { user: { id: "team-2" } }] };

	it("counts tasks created by someone outside the team", () => {
		expect(
			countUserPosts(
				[{ createdBy: "team-1" }, { createdBy: "user-9" }, { createdBy: "user-8" }, { createdBy: null }, {}],
				organization
			)
		).toBe(2);
	});

	it("returns null when the team cannot be resolved", () => {
		expect(countUserPosts([{ createdBy: "user-9" }], { members: [] })).toBeNull();
	});
});

describe("release description helpers", () => {
	const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
	const heading = { type: "heading", content: [{ type: "text", text: "New features" }] };
	const doc = {
		type: "doc",
		content: [{ type: "paragraph", content: [] }, paragraph("Follow tasks and mute people."), heading],
	};

	it("uses the opening paragraph as the lede", () => {
		expect(getFirstParagraphText(doc)).toBe("Follow tasks and mute people.");
		expect(getFirstParagraphText(null)).toBe("");
		expect(getFirstParagraphText({ type: "doc", content: [] })).toBe("");
	});

	it("has no lede when the description opens with something else", () => {
		expect(getFirstParagraphText({ type: "doc", content: [heading, paragraph("Later.")] })).toBe("");
	});

	it("returns the rest of the description after the lede", () => {
		expect(getNotesAfterLede(doc)).toEqual({ type: "doc", content: [heading] });
		const noLede = { type: "doc", content: [heading, paragraph("Later.")] };
		expect(getNotesAfterLede(noLede)).toEqual(noLede);
	});

	it("returns null when only the lede is there", () => {
		expect(getNotesAfterLede({ type: "doc", content: [paragraph("Only this.")] })).toBeNull();
		expect(getNotesAfterLede(null)).toBeNull();
	});
});

describe("summarizeStatusUpdates", () => {
	it("takes the newest update's health and totals the comments", () => {
		expect(
			summarizeStatusUpdates([
				{ health: "at_risk", commentCount: 2 },
				{ health: "on_track", commentCount: 3 },
			])
		).toEqual({ health: "at_risk", updateCount: 2, commentCount: 5 });
	});

	it("has no health when there are no updates", () => {
		expect(summarizeStatusUpdates([])).toEqual({ health: null, updateCount: 0, commentCount: 0 });
		expect(summarizeStatusUpdates(undefined)).toEqual({ health: null, updateCount: 0, commentCount: 0 });
	});
});

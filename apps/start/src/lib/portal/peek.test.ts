import { describe, expect, it } from "vitest";
import {
	fullPostLinkLabel,
	mapPublicTask,
	normalizeShortId,
	type PublicTaskResponse,
	shouldInterceptRowClick,
} from "./peek";

describe("normalizeShortId", () => {
	it("accepts positive integers as numbers or strings", () => {
		expect(normalizeShortId(55)).toBe(55);
		expect(normalizeShortId("55")).toBe(55);
		expect(normalizeShortId(" 7 ")).toBe(7);
	});

	it("rejects anything that is not a positive integer", () => {
		expect(normalizeShortId(0)).toBeNull();
		expect(normalizeShortId(-3)).toBeNull();
		expect(normalizeShortId(1.5)).toBeNull();
		expect(normalizeShortId(Number.NaN)).toBeNull();
		expect(normalizeShortId("abc")).toBeNull();
		expect(normalizeShortId("")).toBeNull();
		expect(normalizeShortId(null)).toBeNull();
		expect(normalizeShortId(undefined)).toBeNull();
	});
});

describe("shouldInterceptRowClick", () => {
	const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

	it("intercepts a plain left click", () => {
		expect(shouldInterceptRowClick(plain)).toBe(true);
	});

	it("leaves modified and non-primary clicks to the browser", () => {
		expect(shouldInterceptRowClick({ ...plain, metaKey: true })).toBe(false);
		expect(shouldInterceptRowClick({ ...plain, ctrlKey: true })).toBe(false);
		expect(shouldInterceptRowClick({ ...plain, shiftKey: true })).toBe(false);
		expect(shouldInterceptRowClick({ ...plain, altKey: true })).toBe(false);
		expect(shouldInterceptRowClick({ ...plain, button: 1 })).toBe(false);
		expect(shouldInterceptRowClick({ ...plain, button: 2 })).toBe(false);
	});
});

describe("fullPostLinkLabel", () => {
	it("pluralises the comment count", () => {
		expect(fullPostLinkLabel(0)).toBe("Read the full post");
		expect(fullPostLinkLabel(1)).toBe("Read the full post and 1 comment");
		expect(fullPostLinkLabel(4)).toBe("Read the full post and 4 comments");
	});

	it("never shows a negative count", () => {
		expect(fullPostLinkLabel(-2)).toBe("Read the full post");
	});
});

describe("mapPublicTask", () => {
	const response: PublicTaskResponse = {
		id: "task_1",
		organizationId: "org_1",
		shortId: 55,
		title: "Notification system overhaul",
		description: { type: "doc", content: [] },
		status: "in-progress",
		voteCount: 3,
		createdAt: "2026-04-26T10:00:00.000Z",
		updatedAt: null,
		createdBy: { id: "user_1", name: "Tommerty", image: null },
		category: "cat_1",
		releaseId: null,
	};

	it("turns ISO strings into dates and keeps the rest", () => {
		const post = mapPublicTask(response);
		expect(post.id).toBe("task_1");
		expect(post.shortId).toBe(55);
		expect(post.status).toBe("in-progress");
		expect(post.voteCount).toBe(3);
		expect(post.createdAt).toEqual(new Date("2026-04-26T10:00:00.000Z"));
		expect(post.updatedAt).toBeNull();
		expect(post.createdBy?.name).toBe("Tommerty");
		expect(post.category).toBe("cat_1");
	});

	it("leaves the GitHub link and comment stubs unset", () => {
		const post = mapPublicTask(response);
		expect(post.githubIssue).toBeUndefined();
		expect(post.comments).toBeUndefined();
	});

	it("defaults a missing creator to null", () => {
		expect(mapPublicTask({ ...response, createdBy: undefined }).createdBy).toBeNull();
	});
});

import { describe, expect, it } from "vitest";
import { joinChannels, sameChannels } from "./sse-channels";

describe("joinChannels", () => {
	it("passes a single channel through untouched, exactly as single-channel callers always sent it", () => {
		expect(joinChannels("tasks")).toBe("tasks");
		expect(joinChannels("admin")).toBe("admin");
		expect(joinChannels("task:abc-123")).toBe("task:abc-123");
		expect(joinChannels("tasks;task:abc-123")).toBe("tasks;task:abc-123");
	});

	it("joins several channels with commas, keeping the order (the first is the primary channel)", () => {
		expect(joinChannels(["tasks", "releases"])).toBe("tasks,releases");
		expect(joinChannels(["releases", "tasks"])).toBe("releases,tasks");
	});

	it("collapses a one-item list to the plain channel, and drops empties and duplicates", () => {
		expect(joinChannels(["tasks"])).toBe("tasks");
		expect(joinChannels(["tasks", "", "tasks", "releases"])).toBe("tasks,releases");
	});

	it("returns null for no channel", () => {
		expect(joinChannels(undefined)).toBeNull();
		expect(joinChannels(null)).toBeNull();
		expect(joinChannels([])).toBeNull();
		expect(joinChannels([""])).toBeNull();
	});
});

describe("sameChannels", () => {
	it("compares as a set: order doesn't matter", () => {
		expect(sameChannels(["tasks", "releases"], ["releases", "tasks"])).toBe(true);
		expect(sameChannels("tasks,releases", ["releases", "tasks"])).toBe(true);
	});

	it("tells different channel sets apart", () => {
		expect(sameChannels(["tasks", "releases"], ["tasks"])).toBe(false);
		expect(sameChannels(["tasks", "releases"], "tasks")).toBe(false);
		expect(sameChannels("tasks", "releases")).toBe(false);
		expect(sameChannels(["tasks", "releases"], ["tasks", "admin"])).toBe(false);
	});

	it("keeps single-channel comparisons exactly as the old string equality", () => {
		expect(sameChannels("tasks", "tasks")).toBe(true);
		expect(sameChannels("task:a", "task:b")).toBe(false);
		expect(sameChannels("tasks", ["tasks"])).toBe(true);
	});

	it("treats every form of 'no channel' as the same, and different from any channel", () => {
		expect(sameChannels(null, undefined)).toBe(true);
		expect(sameChannels([], null)).toBe(true);
		expect(sameChannels(null, "tasks")).toBe(false);
		expect(sameChannels(undefined, ["tasks"])).toBe(false);
	});
});

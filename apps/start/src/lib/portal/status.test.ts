import { describe, expect, it } from "vitest";
import { getPortalStatus, getReleaseDate, getStepperIndex, isShipped, isVotingClosed, STEPPER_STEPS } from "./status";

describe("getPortalStatus", () => {
	it("relabels each internal status for end users", () => {
		expect(getPortalStatus("backlog")).toEqual({ label: "Open", variant: "open", stepIndex: 0 });
		expect(getPortalStatus("todo")).toEqual({ label: "Planned", variant: "planned", stepIndex: 1 });
		expect(getPortalStatus("in-progress")).toEqual({ label: "In Progress", variant: "progress", stepIndex: 2 });
		expect(getPortalStatus("done")).toEqual({ label: "Done", variant: "done", stepIndex: 3 });
		expect(getPortalStatus("canceled")).toEqual({ label: "Won't do", variant: "closed", stepIndex: null });
	});

	it("treats unknown statuses as Open", () => {
		expect(getPortalStatus("something-else").label).toBe("Open");
	});

	it("keeps stepper steps aligned with step indexes", () => {
		expect(STEPPER_STEPS).toHaveLength(4);
		expect(STEPPER_STEPS[getStepperIndex("in-progress") ?? -1]).toBe("In Progress");
		expect(getStepperIndex("canceled")).toBeNull();
	});
});

describe("isVotingClosed", () => {
	it("only closes voting for canceled posts", () => {
		expect(isVotingClosed("canceled")).toBe(true);
		expect(isVotingClosed("done")).toBe(false);
		expect(isVotingClosed("backlog")).toBe(false);
	});
});

describe("isShipped", () => {
	it("requires a done task AND a released release", () => {
		expect(isShipped({ status: "done" }, { status: "released" })).toBe(true);
		expect(isShipped({ status: "done" }, { status: "in-progress" })).toBe(false);
		expect(isShipped({ status: "in-progress" }, { status: "released" })).toBe(false);
		expect(isShipped({ status: "done" }, null)).toBe(false);
		expect(isShipped({ status: "done" }, undefined)).toBe(false);
	});
});

describe("getReleaseDate", () => {
	const createdAt = new Date("2026-01-01T00:00:00Z");
	const targetDate = new Date("2026-02-01T00:00:00Z");
	const releasedAt = new Date("2026-03-01T00:00:00Z");

	it("prefers releasedAt, then targetDate, then createdAt", () => {
		expect(getReleaseDate({ releasedAt, targetDate, createdAt })).toEqual(releasedAt);
		expect(getReleaseDate({ releasedAt: null, targetDate, createdAt })).toEqual(targetDate);
		expect(getReleaseDate({ releasedAt: null, targetDate: null, createdAt })).toEqual(createdAt);
	});

	it("accepts ISO strings and returns null when nothing is usable", () => {
		expect(getReleaseDate({ releasedAt: "2026-03-01T00:00:00.000Z" })?.toISOString()).toBe(
			"2026-03-01T00:00:00.000Z"
		);
		expect(getReleaseDate({ releasedAt: null, targetDate: undefined, createdAt: "nope" })).toBeNull();
	});
});

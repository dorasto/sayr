import { describe, expect, it } from "vitest";
import { getRowClickAction, getUrlSyncAction } from "./board-panel";

describe("getUrlSyncAction", () => {
	it("puts the overview in on a fresh mount without a selection", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: null, applied: undefined })).toBe("show-rail");
		expect(getUrlSyncAction({ desktop: false, urlShortId: null, applied: undefined })).toBe("show-rail");
	});

	it("does nothing while the overview is already showing", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: null, applied: null })).toBe("none");
	});

	it("returns to the overview when the selection leaves the URL", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: null, applied: 55 })).toBe("show-rail");
	});

	it("opens a deep-linked post on desktop", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: 55, applied: undefined })).toBe("show-post");
		expect(getUrlSyncAction({ desktop: true, urlShortId: 55, applied: null })).toBe("show-post");
	});

	it("swaps to another post when the URL selects a different one", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: 56, applied: 55 })).toBe("show-post");
	});

	it("does nothing while the selected post is already showing", () => {
		expect(getUrlSyncAction({ desktop: true, urlShortId: 55, applied: 55 })).toBe("none");
	});

	it("redirects a deep link below the desktop width to the full post", () => {
		expect(getUrlSyncAction({ desktop: false, urlShortId: 55, applied: undefined })).toBe("redirect-to-post");
		expect(getUrlSyncAction({ desktop: false, urlShortId: 55, applied: null })).toBe("redirect-to-post");
	});

	it("drops the selection when the window is narrowed with a post showing", () => {
		expect(getUrlSyncAction({ desktop: false, urlShortId: 55, applied: 55 })).toBe("clear-post");
	});
});

describe("getRowClickAction", () => {
	const base = { desktop: true, intercept: true, rowShortId: 12, selectedShortId: null };

	it("selects the clicked post on desktop", () => {
		expect(getRowClickAction(base)).toBe("select");
		expect(getRowClickAction({ ...base, selectedShortId: 7 })).toBe("select");
	});

	it("deselects when the selected row is clicked again", () => {
		expect(getRowClickAction({ ...base, selectedShortId: 12 })).toBe("deselect");
	});

	it("follows the link below the desktop width", () => {
		expect(getRowClickAction({ ...base, desktop: false })).toBe("follow-link");
	});

	it("follows the link for modified clicks and rows without a short id", () => {
		expect(getRowClickAction({ ...base, intercept: false })).toBe("follow-link");
		expect(getRowClickAction({ ...base, rowShortId: null })).toBe("follow-link");
	});
});

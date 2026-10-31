import { describe, expect, it } from "vitest";
import { isPlainLeftClick, type OpenItemClick } from "./open-item";

const PLAIN: OpenItemClick = {
	button: 0,
	metaKey: false,
	ctrlKey: false,
	shiftKey: false,
	altKey: false,
	defaultPrevented: false,
};

describe("isPlainLeftClick", () => {
	it("accepts a plain primary click", () => {
		expect(isPlainLeftClick(PLAIN)).toBe(true);
	});

	it("leaves modifier clicks to the link", () => {
		expect(isPlainLeftClick({ ...PLAIN, metaKey: true })).toBe(false);
		expect(isPlainLeftClick({ ...PLAIN, ctrlKey: true })).toBe(false);
		expect(isPlainLeftClick({ ...PLAIN, shiftKey: true })).toBe(false);
		expect(isPlainLeftClick({ ...PLAIN, altKey: true })).toBe(false);
	});

	it("leaves other buttons and already-handled clicks alone", () => {
		expect(isPlainLeftClick({ ...PLAIN, button: 1 })).toBe(false);
		expect(isPlainLeftClick({ ...PLAIN, defaultPrevented: true })).toBe(false);
	});
});

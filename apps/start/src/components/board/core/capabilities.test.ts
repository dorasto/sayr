import { describe, expect, it } from "vitest";
import { ADMIN_CAPABILITIES, READ_ONLY_CAPABILITIES, resolveCapabilities } from "./capabilities";

describe("resolveCapabilities", () => {
	it("returns the base untouched when there are no overrides or view", () => {
		expect(resolveCapabilities(ADMIN_CAPABILITIES)).toEqual(ADMIN_CAPABILITIES);
		expect(resolveCapabilities(READ_ONLY_CAPABILITIES)).toEqual(READ_ONLY_CAPABILITIES);
	});

	it("does not mutate the base", () => {
		const snapshot = { ...ADMIN_CAPABILITIES };
		resolveCapabilities(ADMIN_CAPABILITIES, { canBulk: false }, { supports: { drag: false } });
		expect(ADMIN_CAPABILITIES).toEqual(snapshot);
	});

	it("applies overrides over the base", () => {
		const resolved = resolveCapabilities(ADMIN_CAPABILITIES, { canBulk: false, canSavedViews: false });
		expect(resolved.canBulk).toBe(false);
		expect(resolved.canSavedViews).toBe(false);
		expect(resolved.canDrag).toBe(true);
		expect(resolved.canEditFields).toBe(true);
	});

	it("ANDs the view's supports.drag into canDrag", () => {
		expect(resolveCapabilities(ADMIN_CAPABILITIES, undefined, { supports: { drag: false } }).canDrag).toBe(false);
		expect(resolveCapabilities(ADMIN_CAPABILITIES, undefined, { supports: { drag: true } }).canDrag).toBe(true);
	});

	it("treats a view with no drag opinion as not narrowing", () => {
		expect(resolveCapabilities(ADMIN_CAPABILITIES, undefined, {}).canDrag).toBe(true);
		expect(resolveCapabilities(ADMIN_CAPABILITIES, undefined, { supports: {} }).canDrag).toBe(true);
	});

	it("never lets a view grant drag the board doesn't allow", () => {
		expect(resolveCapabilities(READ_ONLY_CAPABILITIES, undefined, { supports: { drag: true } }).canDrag).toBe(false);
		expect(resolveCapabilities(ADMIN_CAPABILITIES, { canDrag: false }, { supports: { drag: true } }).canDrag).toBe(
			false
		);
	});

	it("leaves every other capability alone when the view narrows drag", () => {
		const resolved = resolveCapabilities(ADMIN_CAPABILITIES, undefined, { supports: { drag: false } });
		expect(resolved).toEqual({ ...ADMIN_CAPABILITIES, canDrag: false });
	});
});

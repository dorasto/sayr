import { describe, expect, it } from "vitest";
import { isSafeReturnUrl, isSessionNotFresh } from "./reauth";

describe("isSafeReturnUrl", () => {
	it("accepts the root domain and its subdomains", () => {
		expect(isSafeReturnUrl("https://sayr.io/settings", "sayr.io")).toBe(true);
		expect(isSafeReturnUrl("https://platform.sayr.io/?settings=security", "sayr.io")).toBe(true);
		expect(isSafeReturnUrl("http://test.app.localhost:3000/", "app.localhost")).toBe(true);
	});

	it("rejects other sites, look-alikes and non-http URLs", () => {
		expect(isSafeReturnUrl("https://evil.com/", "sayr.io")).toBe(false);
		expect(isSafeReturnUrl("https://evilsayr.io/", "sayr.io")).toBe(false);
		expect(isSafeReturnUrl("https://sayr.io.evil.com/", "sayr.io")).toBe(false);
		expect(isSafeReturnUrl("javascript:alert(1)", "sayr.io")).toBe(false);
		expect(isSafeReturnUrl("/relative", "sayr.io")).toBe(false);
	});
});

describe("isSessionNotFresh", () => {
	it("matches only Better Auth's SESSION_NOT_FRESH code", () => {
		expect(isSessionNotFresh({ code: "SESSION_NOT_FRESH" })).toBe(true);
		expect(isSessionNotFresh({ code: "UNAUTHORIZED" })).toBe(false);
		expect(isSessionNotFresh(null)).toBe(false);
	});
});

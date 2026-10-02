import { describe, expect, it } from "vitest";
import { isSafeLinkHref } from "./link-safety";

describe("isSafeLinkHref", () => {
	it("allows http, https and mailto", () => {
		expect(isSafeLinkHref("https://sayr.io/docs")).toBe(true);
		expect(isSafeLinkHref("http://localhost:3000")).toBe(true);
		expect(isSafeLinkHref("mailto:team@sayr.io")).toBe(true);
		expect(isSafeLinkHref("  HTTPS://sayr.io  ")).toBe(true);
	});

	it("rejects script-capable and other schemes", () => {
		expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
		expect(isSafeLinkHref("JavaScript:alert(1)")).toBe(false);
		expect(isSafeLinkHref(" \tjava\nscript:alert(1)")).toBe(false);
		expect(isSafeLinkHref("data:text/html,<script>alert(1)</script>")).toBe(false);
		expect(isSafeLinkHref("vbscript:msgbox(1)")).toBe(false);
		expect(isSafeLinkHref("file:///etc/passwd")).toBe(false);
	});

	it("rejects text that is not an absolute URL", () => {
		expect(isSafeLinkHref("")).toBe(false);
		expect(isSafeLinkHref("example.com")).toBe(false);
		expect(isSafeLinkHref("/relative/path")).toBe(false);
		expect(isSafeLinkHref("not a url")).toBe(false);
	});
});

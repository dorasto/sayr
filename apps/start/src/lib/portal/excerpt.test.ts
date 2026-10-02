import { describe, expect, it } from "vitest";
import { buildExcerpt } from "./excerpt";

const text = (value: string, marks?: Array<{ type: string }>) => ({
	type: "text",
	text: value,
	...(marks && { marks }),
});
const p = (...content: Array<ReturnType<typeof text>>) => ({ type: "paragraph", content });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("buildExcerpt", () => {
	it("returns an empty string for missing or malformed descriptions", () => {
		expect(buildExcerpt(null)).toBe("");
		expect(buildExcerpt(undefined)).toBe("");
		expect(buildExcerpt("hello")).toBe("");
		expect(buildExcerpt({ type: "paragraph" })).toBe("");
		expect(buildExcerpt(doc())).toBe("");
	});

	it("joins paragraphs with a space", () => {
		expect(buildExcerpt(doc(p(text("First.")), p(text("Second."))))).toBe("First. Second.");
	});

	it("skips headings, horizontal rules, code blocks and empty paragraphs", () => {
		const description = doc(
			{ type: "heading", attrs: { level: 2 }, content: [text("Describe the feature")] },
			{ type: "paragraph" },
			p(text("   ")),
			{ type: "horizontalRule" },
			{ type: "codeBlock", content: [text("const a = 1;")] },
			p(text("Real content."))
		);
		expect(buildExcerpt(description)).toBe("Real content.");
	});

	it("drops text carrying the templatePlaceholder mark", () => {
		const description = doc(
			p(text("Describe it here", [{ type: "templatePlaceholder" }])),
			p(text("Real "), text("placeholder", [{ type: "templatePlaceholder" }]), text("content"))
		);
		expect(buildExcerpt(description)).toBe("Real content");
	});

	it("drops known issue-template prompt lines but keeps real sentences", () => {
		const description = doc(
			p(text("Steps to reproduce:", [{ type: "bold" }])),
			p(text("Environment")),
			p(text("Browser / OS:")),
			p(text("Note: this keeps happening when I open the board on mobile."))
		);
		expect(buildExcerpt(description)).toBe("Note: this keeps happening when I open the board on mobile.");
	});

	it("flattens lists so items are not fused together", () => {
		const description = doc({
			type: "list",
			content: [p(text("Follow tasks")), p(text("Mute people"))],
		});
		expect(buildExcerpt(description)).toBe("Follow tasks Mute people");
	});

	it("truncates to ~240 characters on a word boundary with an ellipsis", () => {
		const long = Array.from({ length: 80 }, () => "lorem").join(" ");
		const excerpt = buildExcerpt(doc(p(text(long))));
		expect(excerpt.length).toBeLessThanOrEqual(241);
		expect(excerpt.endsWith("…")).toBe(true);
		expect(excerpt.slice(0, -1).endsWith("lorem")).toBe(true);
	});

	it("honours a custom max length and leaves short text alone", () => {
		expect(buildExcerpt(doc(p(text("short"))), 10)).toBe("short");
		expect(buildExcerpt(doc(p(text("one two three four five"))), 14)).toBe("one two three…");
	});
});

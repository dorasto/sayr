import { describe, expect, it } from "vitest";
import { getFirstSentence, inlineToPlainText, parseReleaseInline, parseReleaseNotes } from "./release-notes";

describe("parseReleaseNotes", () => {
	const markdown = [
		"## New features",
		"",
		"- Manage releases from your terminal with the new CLI. (SAY-79)",
		"- The Paseo plugin is published to npm. (SAY-78)",
		"",
		"## Fixes",
		"",
		"- The playground no longer returns a 500. (SAY-76)",
	].join("\n");

	it("turns headings into eyebrows and bullets into list items", () => {
		const blocks = parseReleaseNotes(markdown, "SAY");
		expect(blocks.map((block) => block.type)).toEqual(["heading", "list", "heading", "list"]);
		expect(blocks[0]).toEqual({ type: "heading", text: "New features" });
		const list = blocks[1];
		expect(list?.type === "list" && list.items).toHaveLength(2);
	});

	it("linkifies task keys with the org prefix only", () => {
		const [, list] = parseReleaseNotes(markdown, "SAY");
		const first = list?.type === "list" ? list.items[0] : [];
		expect(first?.some((token) => token.type === "taskKey" && token.key === "SAY-79" && token.shortId === 79)).toBe(
			true
		);

		const other = parseReleaseNotes("- Done (SAY-1)", "ACME");
		expect(other[0]?.type === "list" && other[0].items[0]?.some((token) => token.type === "taskKey")).toBe(false);
	});

	it("keeps a loose list together across blank lines and flattens nesting", () => {
		const blocks = parseReleaseNotes("- one\n\n- two\n  - nested\n", "SAY");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.type === "list" && blocks[0].items).toHaveLength(3);
	});

	it("joins wrapped paragraph and bullet lines", () => {
		const blocks = parseReleaseNotes("First line\nsecond line\n\n- bullet\n  continued", "SAY");
		expect(blocks[0]).toEqual({ type: "paragraph", inline: [{ type: "text", text: "First line second line" }] });
		const list = blocks[1];
		expect(list?.type === "list" && inlineToPlainText(list.items[0] ?? [])).toBe("bullet continued");
	});

	it("drops code fences, tables, images and rules", () => {
		const blocks = parseReleaseNotes(
			'Intro\n\n```ts\nconst a = 1;\n```\n\n| a | b |\n| - | - |\n\n---\n\n<img src="x" />\n',
			"SAY"
		);
		expect(blocks).toHaveLength(1);
	});

	it("returns nothing for empty input", () => {
		expect(parseReleaseNotes(null, "SAY")).toEqual([]);
		expect(parseReleaseNotes("", "SAY")).toEqual([]);
	});
});

describe("parseReleaseInline", () => {
	it("parses links, bold and code, and unescapes markdown punctuation", () => {
		const tokens = parseReleaseInline("See [the docs](https://example.com/a) for **bold** and `code` \\_x\\_", "SAY");
		expect(tokens).toEqual([
			{ type: "text", text: "See " },
			{ type: "link", text: "the docs", href: "https://example.com/a" },
			{ type: "text", text: " for " },
			{ type: "bold", text: "bold" },
			{ type: "text", text: " and " },
			{ type: "code", text: "code" },
			{ type: "text", text: " _x_" },
		]);
	});

	it("renders links with an unsafe scheme as plain text", () => {
		const tokens = parseReleaseInline("[click](javascript:alert(1))", "SAY");
		expect(tokens.some((token) => token.type === "link")).toBe(false);
	});
});

describe("getFirstSentence", () => {
	it("returns the first sentence of the first paragraph", () => {
		expect(getFirstSentence("Follow tasks and mute people. Then see your inbox.\n\n- bullet")).toBe(
			"Follow tasks and mute people."
		);
	});

	it("falls back to the first bullet when there is no paragraph", () => {
		expect(getFirstSentence("## New features\n\n- Manage releases from the CLI. More here.")).toBe(
			"Manage releases from the CLI."
		);
	});

	it("truncates long sentences with an ellipsis", () => {
		const long = `${"word ".repeat(80)}end`;
		const result = getFirstSentence(long, 40);
		expect(result.length).toBeLessThanOrEqual(40);
		expect(result.endsWith("…")).toBe(true);
	});

	it("is empty when there is no text", () => {
		expect(getFirstSentence("")).toBe("");
		expect(getFirstSentence(null)).toBe("");
		expect(getFirstSentence("## Only a heading")).toBe("");
	});
});

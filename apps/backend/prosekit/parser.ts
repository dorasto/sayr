import type { schema } from "@repo/database";
// @ts-expect-error — markdown-it ships no type declarations
import MarkdownIt from "markdown-it";
// @ts-expect-error — same as above, markdown-it's Token type has no declarations either
import type Token from "markdown-it/lib/token.mjs";
import { MarkdownParser } from "prosemirror-markdown";
import { prosekitSchema } from "./schema";

const md = new MarkdownIt({
	html: false,
	linkify: true,
	breaks: true,
});

/**
 * The real editor schema (prosemirror-flat-list, via
 * @prosekit/extensions/list) has one flat "list" node per *item*, with no
 * shared wrapper for the whole bullet/ordered list and no separate
 * list-item node — see the doc comment on the `list` node in ./schema.ts.
 * markdown-it's `list_item_open` tokens don't carry which kind of list
 * they're in or their position within it, so this walks a parse's full
 * token stream once (tracking open bullet_list/ordered_list scopes on a
 * stack) to compute each list_item's {kind, order} up front. Cached per
 * token-array reference (one entry per `.parse()` call) so it only runs
 * once per document, not once per list item.
 */
const listItemAttrsCache = new WeakMap<Token[], Map<number, { kind: "bullet" | "ordered"; order?: number }>>();

function computeListItemAttrs(tokens: Token[]): Map<number, { kind: "bullet" | "ordered"; order?: number }> {
	const attrsByIndex = new Map<number, { kind: "bullet" | "ordered"; order?: number }>();
	const stack: { kind: "bullet" | "ordered"; nextOrder: number }[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];
		if (tok.type === "bullet_list_open") {
			stack.push({ kind: "bullet", nextOrder: 1 });
		} else if (tok.type === "ordered_list_open") {
			const start = tok.attrGet("start") ? Number(tok.attrGet("start")) : 1;
			stack.push({ kind: "ordered", nextOrder: start });
		} else if (tok.type === "bullet_list_close" || tok.type === "ordered_list_close") {
			stack.pop();
		} else if (tok.type === "list_item_open") {
			const ctx = stack[stack.length - 1];
			if (ctx) {
				attrsByIndex.set(
					i,
					ctx.kind === "ordered" ? { kind: "ordered", order: ctx.nextOrder++ } : { kind: "bullet" }
				);
			}
		}
	}
	return attrsByIndex;
}

function getListItemAttrs(tokens: Token[], i: number): { kind: "bullet" | "ordered"; order?: number } {
	let attrsByIndex = listItemAttrsCache.get(tokens);
	if (!attrsByIndex) {
		attrsByIndex = computeListItemAttrs(tokens);
		listItemAttrsCache.set(tokens, attrsByIndex);
	}
	return attrsByIndex.get(i) ?? { kind: "bullet" };
}

const prosekitMarkdownParser = new MarkdownParser(prosekitSchema, md, {
	paragraph: { block: "paragraph" },
	blockquote: { block: "blockquote" },

	heading: {
		block: "heading",
		getAttrs: (tok) => ({
			level: Number(tok.tag.slice(1)),
		}),
	},

	// The whole-list wrapper tokens don't map to anything — each item
	// becomes its own "list" node instead (see getListItemAttrs above).
	bullet_list: { ignore: true },
	ordered_list: { ignore: true },

	list_item: {
		block: "list",
		getAttrs: (_tok, tokens, i) => getListItemAttrs(tokens, i),
	},

	fence: {
		block: "codeBlock",
		getAttrs: (tok) => ({
			language: tok.info || null,
		}),
	},

	code_block: {
		block: "codeBlock",
		getAttrs: (tok) => ({
			language: tok.info || null,
		}),
	},

	hr: { node: "horizontalRule" },
	hardbreak: { node: "hardBreak" },

	em: { mark: "italic" },
	strong: { mark: "bold" },
	s: { mark: "strike" },
	code_inline: { mark: "code" },

	link: {
		mark: "link",
		getAttrs: (tok) => ({
			href: tok.attrGet("href"),
			title: tok.attrGet("title"),
		}),
	},
});

export function markdownToProsekitJSON(markdown: string): schema.NodeJSON {
	try {
		if (!markdown || markdown.trim() === "") {
			return {
				type: "doc",
				content: [],
			};
		}

		const doc = prosekitMarkdownParser.parse(markdown);
		return doc.toJSON() as schema.NodeJSON;
	} catch (error) {
		console.error("Markdown → ProseKit conversion failed:", error);
		return {
			type: "doc",
			content: [],
		};
	}
}

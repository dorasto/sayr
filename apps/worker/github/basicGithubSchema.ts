import { Schema } from "prosemirror-model";

export const basicGithubSchema = new Schema({
	nodes: {
		doc: {
			content: "block+",
		},

		text: {
			group: "inline",
		},

		paragraph: {
			group: "block",
			content: "inline*",
			toDOM() {
				return ["p", 0];
			},
		},

		heading: {
			group: "block",
			content: "inline*",
			attrs: {
				level: { default: 1 },
			},
			toDOM(node) {
				return ["h" + node.attrs.level, 0];
			},
		},

		blockquote: {
			group: "block",
			content: "block+",
			toDOM() {
				return ["blockquote", 0];
			},
		},

		horizontalRule: {
			group: "block",
			toDOM() {
				return ["hr"];
			},
		},

		codeBlock: {
			group: "block",
			content: "text*",
			attrs: {
				language: { default: null },
			},
			code: true,
			toDOM(node) {
				return ["pre", node.attrs.language ? ["code", { "data-language": node.attrs.language }, 0] : ["code", 0]];
			},
		},

		// Matches @prosekit/extensions/list's real node spec (backed by
		// prosemirror-flat-list) — the actual editor's schema (see
		// apps/worker/prosekit/schema.ts) has a single flat "list" node with
		// no separate "bulletList"/"orderedList"/"listItem" wrapper; nested
		// lists are just adjacent "list" nodes inside a parent list's content.
		// This must stay structurally identical or NodeJSON produced here
		// (see markdownToProsekit.ts) fails with "Unknown node type" when the
		// frontend editor tries to load it.
		list: {
			group: "list block",
			content: "block+",
			attrs: {
				kind: { default: "bullet" }, // "bullet" | "ordered" | "task" | "toggle"
				order: { default: null },
				checked: { default: false },
				collapsed: { default: false },
			},
			toDOM(node) {
				return node.attrs.kind === "ordered" ? ["ol", { start: node.attrs.order }, 0] : ["ul", 0];
			},
		},

		hardBreak: {
			inline: true,
			group: "inline",
			selectable: false,
			toDOM() {
				return ["br"];
			},
		},

		// Only ever constructed programmatically (see resolveGithubIssueReferences
		// in markdownToProsekit.ts) when a bare `#123` reference in incoming
		// GitHub markdown resolves to a linked Sayr task — never parsed from
		// markdown syntax directly. Attrs mirror the frontend's mention node
		// (apps/backend/prosekit/schema.ts) so the resulting JSON renders with
		// the same TaskMention UI once it lands in a task's description/comments.
		mention: {
			group: "inline",
			inline: true,
			atom: true,
			attrs: {
				id: { default: null },
				value: { default: "" },
				kind: { default: null },
			},
			toDOM(node) {
				return ["span", { "data-mention": node.attrs.kind, "data-id": node.attrs.id }, node.attrs.value];
			},
		},
	},

	marks: {
		bold: {
			toDOM() {
				return ["strong", 0];
			},
		},

		italic: {
			toDOM() {
				return ["em", 0];
			},
		},

		strike: {
			toDOM() {
				return ["s", 0];
			},
		},

		code: {
			toDOM() {
				return ["code", 0];
			},
		},

		link: {
			attrs: {
				href: {},
				title: { default: null },
			},
			inclusive: false,
			toDOM(mark) {
				return [
					"a",
					{
						href: mark.attrs.href,
						title: mark.attrs.title,
					},
					0,
				];
			},
		},
	},
});

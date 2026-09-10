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

		bulletList: {
			group: "block",
			content: "listItem+",
			toDOM() {
				return ["ul", 0];
			},
		},

		orderedList: {
			group: "block",
			content: "listItem+",
			attrs: {
				start: { default: 1 },
			},
			toDOM(node) {
				return ["ol", node.attrs.start === 1 ? {} : { start: node.attrs.start }, 0];
			},
		},

		listItem: {
			content: "block+",
			toDOM() {
				return ["li", 0];
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

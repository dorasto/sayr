import { Schema } from "prosemirror-model";

export const prosekitSchema = new Schema({
	nodes: {
		doc: {
			content: "block+",
		},
		text: {
			group: "inline",
		},
		paragraph: {
			content: "inline*",
			group: "block",
			parseDOM: [{ tag: "p" }],
			toDOM: () => ["p", 0],
		},
		heading: {
			attrs: { level: { default: 1 } },
			content: "inline*",
			group: "block",
			defining: true,
			parseDOM: [
				{ tag: "h1", attrs: { level: 1 } },
				{ tag: "h2", attrs: { level: 2 } },
				{ tag: "h3", attrs: { level: 3 } },
				{ tag: "h4", attrs: { level: 4 } },
				{ tag: "h5", attrs: { level: 5 } },
				{ tag: "h6", attrs: { level: 6 } },
			],
			toDOM: (node) => [`h${node.attrs.level}`, 0],
		},
		blockquote: {
			content: "block+",
			group: "block",
			defining: true,
			parseDOM: [{ tag: "blockquote" }],
			toDOM: () => ["blockquote", 0],
		},
		codeBlock: {
			attrs: { language: { default: "" } },
			content: "text*",
			marks: "",
			group: "block",
			code: true,
			defining: true,
			parseDOM: [
				{
					tag: "pre",
					preserveWhitespace: "full",
					getAttrs: (node) => ({
						language: (node as HTMLElement).getAttribute("data-language") || "",
					}),
				},
			],
			toDOM: (node) => ["pre", { "data-language": node.attrs.language }, ["code", 0]],
		},
		bulletList: {
			content: "listItem+",
			group: "block",
			parseDOM: [{ tag: "ul" }],
			toDOM: () => ["ul", 0],
		},
		orderedList: {
			attrs: { start: { default: 1 } },
			content: "listItem+",
			group: "block",
			parseDOM: [
				{
					tag: "ol",
					getAttrs: (node) => ({
						start: (node as HTMLElement).hasAttribute("start")
							? Number((node as HTMLElement).getAttribute("start"))
							: 1,
					}),
				},
			],
			toDOM: (node) => (node.attrs.start === 1 ? ["ol", 0] : ["ol", { start: node.attrs.start }, 0]),
		},
		listItem: {
			content: "paragraph block*",
			parseDOM: [{ tag: "li" }],
			toDOM: () => ["li", 0],
			defining: true,
		},
		horizontalRule: {
			group: "block",
			parseDOM: [{ tag: "hr" }],
			toDOM: () => ["hr"],
		},
		hardBreak: {
			inline: true,
			group: "inline",
			selectable: false,
			parseDOM: [{ tag: "br" }],
			toDOM: () => ["br"],
		},
		image: {
			attrs: {
				src: { default: null },
				alt: { default: null },
				title: { default: null },
				width: { default: null },
				height: { default: null },
			},
			group: "block",
			draggable: true,
			parseDOM: [
				{
					tag: "img[src]",
					getAttrs: (node) => ({
						src: (node as HTMLElement).getAttribute("src"),
						alt: (node as HTMLElement).getAttribute("alt"),
						title: (node as HTMLElement).getAttribute("title"),
						width: (node as HTMLElement).getAttribute("width"),
						height: (node as HTMLElement).getAttribute("height"),
					}),
				},
			],
			toDOM: (node) => ["img", node.attrs],
		},
		video: {
			attrs: {
				src: { default: null },
				width: { default: null },
				height: { default: null },
				controls: { default: true },
				autoplay: { default: false },
				loop: { default: false },
				muted: { default: false },
			},
			group: "block",
			atom: true,
			draggable: true,
			selectable: true,
			parseDOM: [
				{
					tag: "video",
					getAttrs: (node) => ({
						src: (node as HTMLElement).getAttribute("src"),
						width: (node as HTMLElement).getAttribute("width"),
						height: (node as HTMLElement).getAttribute("height"),
						controls: (node as HTMLElement).hasAttribute("controls"),
						autoplay: (node as HTMLElement).hasAttribute("autoplay"),
						loop: (node as HTMLElement).hasAttribute("loop"),
						muted: (node as HTMLElement).hasAttribute("muted"),
					}),
				},
			],
			toDOM: (node) => {
				const { src, width, height, controls, autoplay, loop, muted } = node.attrs;

				const attrs: Record<string, string | null> = {
					src,
					width,
					height,
				};

				if (controls) attrs.controls = "";
				if (autoplay) attrs.autoplay = "";
				if (loop) attrs.loop = "";
				if (muted) attrs.muted = "";

				return ["video", attrs];
			},
		},
		gif: {
			attrs: {
				src: { default: null },
				width: { default: null },
				height: { default: null },
			},
			group: "block",
			draggable: true,
			parseDOM: [
				{
					tag: "img[src]",
					getAttrs: (node) => ({
						src: (node as HTMLElement).getAttribute("src"),
						width: (node as HTMLElement).getAttribute("width"),
						height: (node as HTMLElement).getAttribute("height"),
					}),
				},
			],
			toDOM: (node) => ["img", node.attrs],
		},
		mention: {
			attrs: {
				id: { default: null },
				value: { default: "" },
				kind: { default: null },
			},
			group: "inline",
			inline: true,
			atom: true,
			parseDOM: [
				{
					tag: "span[data-mention]",
					getAttrs: (node) => ({
						id: (node as HTMLElement).getAttribute("data-id"),
						kind: (node as HTMLElement).getAttribute("data-mention"),
						value: (node as HTMLElement).textContent || "",
					}),
				},
			],
			toDOM: (node) => [
				"span",
				{
					class: `mention`,
					"data-kind": node.attrs.kind,
					"data-id": node.attrs.id,
				},
				node.attrs.value,
			],
		},
		table: {
			content: "tableRow+",
			group: "block",
			tableRole: "table",
			isolating: true,
			parseDOM: [{ tag: "table" }],
			toDOM: () => ["table", ["tbody", 0]],
		},
		tableRow: {
			content: "(tableCell | tableHeader)*",
			tableRole: "row",
			parseDOM: [{ tag: "tr" }],
			toDOM: () => ["tr", 0],
		},
		tableCell: {
			attrs: {
				colspan: { default: 1 },
				rowspan: { default: 1 },
			},
			content: "block+",
			tableRole: "cell",
			isolating: true,
			parseDOM: [
				{
					tag: "td",
					getAttrs: (node) => ({
						colspan: Number((node as HTMLElement).getAttribute("colspan")) || 1,
						rowspan: Number((node as HTMLElement).getAttribute("rowspan")) || 1,
					}),
				},
			],
			toDOM: (node) => ["td", node.attrs, 0],
		},
		tableHeader: {
			attrs: {
				colspan: { default: 1 },
				rowspan: { default: 1 },
			},
			content: "block+",
			tableRole: "header_cell",
			isolating: true,
			parseDOM: [
				{
					tag: "th",
					getAttrs: (node) => ({
						colspan: Number((node as HTMLElement).getAttribute("colspan")) || 1,
						rowspan: Number((node as HTMLElement).getAttribute("rowspan")) || 1,
					}),
				},
			],
			toDOM: (node) => ["th", node.attrs, 0],
		},
		list: {
			content: "listItem+",
			group: "block",
			attrs: {
				kind: { default: "bullet" }, // "bullet" or "ordered"
				start: { default: 1 },
			},
			parseDOM: [
				{ tag: "ul", attrs: { kind: "bullet" } },
				{
					tag: "ol",
					getAttrs: (node) => ({
						kind: "ordered",
						start: Number((node as HTMLElement).getAttribute("start")) || 1,
					}),
				},
			],
			toDOM: (node) => (node.attrs.kind === "ordered" ? ["ol", { start: node.attrs.start }, 0] : ["ul", 0]),
		},
	},
	marks: {
		bold: {
			parseDOM: [
				{ tag: "strong" },
				{ tag: "b" },
				{
					style: "font-weight",
					getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value as string) && null,
				},
			],
			toDOM: () => ["strong", 0],
		},
		italic: {
			parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
			toDOM: () => ["em", 0],
		},
		underline: {
			parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
			toDOM: () => ["u", 0],
		},
		strike: {
			parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }, { style: "text-decoration=line-through" }],
			toDOM: () => ["s", 0],
		},
		code: {
			parseDOM: [{ tag: "code" }],
			toDOM: () => ["code", 0],
		},
		link: {
			attrs: {
				href: { default: "" },
				title: { default: null },
			},
			inclusive: false,
			parseDOM: [
				{
					tag: "a[href]",
					getAttrs: (node) => ({
						href: (node as HTMLElement).getAttribute("href"),
						title: (node as HTMLElement).getAttribute("title"),
					}),
				},
			],
			toDOM: (mark) => ["a", { href: mark.attrs.href, title: mark.attrs.title }, 0],
		},
	},
});

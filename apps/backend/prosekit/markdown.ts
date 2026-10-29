import type { schema } from "@repo/database";
import { MarkdownSerializer } from "prosemirror-markdown";
import { prosekitSchema } from "./schema";

const markdownSerializer = new MarkdownSerializer(
	{
		doc: (state, node) => {
			state.renderContent(node);
		},
		paragraph: (state, node) => {
			state.renderInline(node);
			state.closeBlock(node);
		},
		heading: (state, node) => {
			// Clamp: `level` comes from user-supplied JSON — a huge/negative value would
			// make String.repeat throw (RangeError) or allocate an enormous string.
			const level = Math.min(Math.max(Math.trunc(Number(node.attrs.level)) || 1, 1), 6);
			state.write(`${"#".repeat(level)} `);
			state.renderInline(node);
			state.closeBlock(node);
		},
		blockquote: (state, node) => {
			state.wrapBlock("> ", null, node, () => state.renderContent(node));
		},
		codeBlock: (state, node) => {
			state.write(`\`\`\`${node.attrs.language || ""}\n`);
			state.text(node.textContent, false);
			state.ensureNewLine();
			state.write("```");
			state.closeBlock(node);
		},
		bulletList: (state, node) => {
			state.renderList(node, "  ", () => "- ");
		},
		orderedList: (state, node) => {
			const start = node.attrs.start || 1;
			state.renderList(node, "  ", (i) => `${start + i}. `);
		},
		listItem: (state, node) => {
			state.renderContent(node);
		},
		horizontalRule: (state, node) => {
			state.write("---");
			state.closeBlock(node);
		},
		hardBreak: (state) => {
			state.write("  \n");
		},
		image: (state, node) => {
			const { src, width, height } = node.attrs;
			const dims = width && height ? ` width="${width}" height="${height}"` : "";
			state.write(`<img src="${src}"${dims} />`);
			state.closeBlock(node);
		},
		video: (state, node) => {
			state.write(`<video src="${node.attrs.src}" controls></video>`);
			state.closeBlock(node);
		},
		gif: (state, node) => {
			const { src, width, height } = node.attrs;
			const dims = width && height ? ` width="${width}" height="${height}"` : "";
			state.write(`<img src="${src}"${dims} />`);
			state.closeBlock(node);
		},
		mention: (state, node) => {
			state.write(node.attrs.value || "");
		},
		table: (state, node) => {
			const rows: string[][] = [];

			node.forEach((row) => {
				if (row.type.name !== "tableRow") return;
				const cells: string[] = [];
				row.forEach((cell) => {
					cells.push(cell.textContent.replace(/\|/g, "\\|").replace(/\n/g, " "));
				});
				rows.push(cells);
			});

			if (rows.length === 0) return;

			const colCount = rows[0]?.length ?? 0;
			state.write(`| ${rows[0]?.join(" | ")} |\n`);
			state.write(`| ${Array(colCount).fill("---").join(" | ")} |\n`);

			for (let i = 1; i < rows.length; i++) {
				state.write(`| ${rows[i]?.join(" | ")} |\n`);
			}

			state.closeBlock(node);
		},
		tableRow: () => {
			// Handled by table
		},
		tableCell: () => {
			// Handled by table
		},
		tableHeader: () => {
			// Handled by table
		},
		text: (state, node) => {
			// Unfilled template prompts ("Answer...") aren't content — leave them out.
			if (node.marks.some((mark) => mark.type.name === "templatePlaceholder")) return;
			state.text(node.text || "");
		},
		list: (state, node) => {
			const { kind } = node.attrs;
			const start = node.attrs.start || 1;
			state.renderList(node, "  ", (i) => {
				if (kind === "ordered") return `${start + i}. `;
				if (kind === "task") return node.attrs.checked ? "- [x] " : "- [ ] ";
				return "- ";
			});
		},
	},
	{
		bold: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
		italic: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
		strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
		code: { open: "`", close: "`", escape: false },
		underline: { open: "<u>", close: "</u>" },
		// The text itself is dropped by the `text` serializer above; this entry only
		// stops MarkdownSerializer throwing on an unsupported mark.
		templatePlaceholder: { open: "", close: "" },
		link: {
			open: "[",
			close: (_, mark) => {
				const title = mark.attrs.title;
				return title ? `](${mark.attrs.href} "${title}")` : `](${mark.attrs.href})`;
			},
		},
	}
);

/**
 * Drops marks this schema doesn't define. nodeFromJSON throws on the first unknown
 * mark, which turns the whole document into "[Invalid content]" — a mark added to
 * the editor but not mirrored in ./schema.ts should cost its formatting, not the text.
 */
function stripUnknownMarks(node: schema.NodeJSON): schema.NodeJSON {
	return {
		...node,
		...(node.marks && { marks: node.marks.filter((mark) => mark.type in prosekitSchema.marks) }),
		...(node.content && { content: node.content.map(stripUnknownMarks) }),
	};
}

export function prosekitJSONToMarkdown(jsonDoc: schema.NodeJSON): string {
	try {
		const node = prosekitSchema.nodeFromJSON(stripUnknownMarks(jsonDoc));
		return markdownSerializer.serialize(node);
	} catch (error) {
		console.error("ProseKit → Markdown conversion failed:", error);
		return "[Invalid content]";
	}
}

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
			state.write(`${"#".repeat(node.attrs.level)} `);
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
			state.text(node.text || "");
		},
		list: (state, node) => {
			const isOrdered = node.attrs.kind === "ordered";
			const start = node.attrs.start || 1;
			state.renderList(node, "  ", (i) => (isOrdered ? `${start + i}. ` : "- "));
		},
	},
	{
		bold: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
		italic: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
		strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
		code: { open: "`", close: "`", escape: false },
		underline: { open: "<u>", close: "</u>" },
		link: {
			open: "[",
			close: (_, mark) => {
				const title = mark.attrs.title;
				return title ? `](${mark.attrs.href} "${title}")` : `](${mark.attrs.href})`;
			},
		},
	}
);

export function prosekitJSONToMarkdown(jsonDoc: schema.NodeJSON): string {
	try {
		const node = prosekitSchema.nodeFromJSON(jsonDoc);
		return markdownSerializer.serialize(node);
	} catch (error) {
		console.error("ProseKit → Markdown conversion failed:", error);
		return "[Invalid content]";
	}
}

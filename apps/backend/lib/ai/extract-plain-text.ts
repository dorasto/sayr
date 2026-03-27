import type { schema } from "@repo/database";

/**
 * Recursively extract plain text from a ProseMirror/TipTap NodeJSON document.
 * All rich-text structure (marks, node types, attrs) is stripped — only the
 * raw text content is returned, with child nodes joined by a single space.
 */
export function extractPlainText(node: schema.NodeJSON): string {
	if (!node || typeof node !== "object") return "";
	if (node.type === "text" && typeof node.text === "string") return node.text;
	if (Array.isArray(node.content)) {
		return node.content.map(extractPlainText).join(" ");
	}
	return "";
}

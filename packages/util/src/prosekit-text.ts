/**
 * Extracts plain text from a ProseMirror/TipTap document JSON node.
 *
 * Structurally typed against the shape actually used (`type`/`text`/`content`)
 * rather than importing `@repo/database`'s `NodeJSON` — this file stays free
 * of Node.js/database-only imports so it can be used in frontend (Vite/
 * browser) bundles too, same rule as `org-ai.ts`. A real `schema.NodeJSON`
 * value is structurally assignable here without a cast.
 */
export interface PlainTextNode {
	type?: unknown;
	text?: string;
	content?: PlainTextNode[];
}

/** Block-level node types that should be separated by a space when joined. */
const BLOCK_NODE_NAMES = new Set([
	"paragraph",
	"heading",
	"blockquote",
	// The real editor schema (prosemirror-flat-list) uses a single flat
	// "list" node — bulletList/orderedList/listItem never actually appear
	// in live content, but are kept here too in case any already-stored
	// content predates that model.
	"list",
	"bulletList",
	"orderedList",
	"listItem",
	"codeBlock",
	"horizontalRule",
	"hardBreak",
]);

function isBlock(node: PlainTextNode): boolean {
	if (!node.type) return false;
	// ProseMirror NodeType objects expose `.isBlock`; plain-JSON stubs just have `.name`.
	const nt = node.type as unknown as { isBlock?: boolean; name?: string };
	if (typeof nt.isBlock === "boolean") return nt.isBlock;
	if (typeof nt === "string") return BLOCK_NODE_NAMES.has(nt as string);
	if (typeof nt.name === "string") return BLOCK_NODE_NAMES.has(nt.name);
	return false;
}

/**
 * Recursively extract plain text from a ProseMirror/TipTap NodeJSON document.
 * All rich-text structure (marks, node types, attrs) is stripped.
 *
 * Inline children (e.g. text + bold marks) are concatenated without any
 * separator so "foo**bar**baz" becomes "foobarbaz". Block-level children
 * (paragraphs, headings, etc.) are separated by a single space so distinct
 * sentences/blocks are not fused together.
 */
export function extractPlainText(node: PlainTextNode): string {
	if (!node || typeof node !== "object") return "";
	if (node.type === "text" && typeof node.text === "string") return node.text;
	if (!Array.isArray(node.content)) return "";

	let result = "";
	for (const child of node.content) {
		const childText = extractPlainText(child);
		if (!childText) continue;
		if (result && isBlock(child)) {
			result += ` ${childText}`;
		} else {
			result += childText;
		}
	}
	return result;
}

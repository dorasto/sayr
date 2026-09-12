/**
 * Extracts plain text from a ProseKit/ProseMirror document JSON node (task
 * descriptions, comment bodies). Deliberately a local copy of
 * `packages/util/src/prosekit-text.ts` / `packages/cli/src/lib/prosekit.ts`
 * rather than an import of either: `shared/` code is bundled by Paseo's own
 * client bundler (not this monorepo's tooling), and that bundler resolving a
 * pnpm workspace symlink outside this plugin's directory hasn't been verified
 * — a self-contained, dependency-free copy sidesteps the question entirely.
 * Keep this in sync with `packages/util/src/prosekit-text.ts` if that one changes.
 */
export interface ProsekitNode {
	type?: unknown;
	text?: string;
	content?: ProsekitNode[];
}

const BLOCK_NODE_NAMES = new Set([
	"paragraph",
	"heading",
	"blockquote",
	"list",
	"bulletList",
	"orderedList",
	"listItem",
	"codeBlock",
	"horizontalRule",
	"hardBreak",
]);

function isBlock(node: ProsekitNode): boolean {
	return typeof node.type === "string" && BLOCK_NODE_NAMES.has(node.type);
}

export function extractPlainText(node: ProsekitNode | null | undefined): string {
	if (!node || typeof node !== "object") return "";
	if (node.type === "text" && typeof node.text === "string") return node.text;
	if (!Array.isArray(node.content)) return "";

	let result = "";
	for (const child of node.content) {
		const childText = extractPlainText(child);
		if (!childText) continue;
		result += result && isBlock(child) ? ` ${childText}` : childText;
	}
	return result;
}

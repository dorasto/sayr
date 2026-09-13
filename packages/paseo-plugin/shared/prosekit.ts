/**
 * Shape of a ProseKit/ProseMirror document JSON node (task descriptions,
 * comment bodies) — matches the real editor schema in
 * `apps/start/src/components/prosekit/extensions/index.ts`'s
 * `defineBasicExtension()` (doc/paragraph/heading/list/blockquote/codeBlock/
 * hardBreak/horizontalRule nodes; bold/italic/underline/strike/code/link
 * marks). `attrs`/`marks` are needed by `client/prosekit-view.tsx`'s actual
 * rich renderer (heading level, list kind, mark types); `extractPlainText`
 * below only reads `type`/`text`/`content`.
 */
export interface ProsekitMark {
	type: string;
	attrs?: Record<string, unknown>;
}

export interface ProsekitNode {
	type?: string;
	text?: string;
	content?: ProsekitNode[];
	attrs?: Record<string, unknown>;
	marks?: ProsekitMark[];
}

/**
 * Extracts plain text from a document node — a corrected copy of
 * `packages/cli/src/lib/prosekit.ts`'s `renderProsekitPlainText`, not
 * `packages/util/src/prosekit-text.ts`'s `extractPlainText` (the wrong one
 * was mirrored initially: that one joins block boundaries with a single
 * space because it's built for embeddings/search). Blocks join with a blank
 * line. Used where plain text is actually wanted (the agent hand-off prompt
 * in `client/agent-prompt.ts`) — for on-screen display, use
 * `client/prosekit-view.tsx`'s `ProsekitView` instead, which renders real
 * headings/bold/lists rather than flattening them to a string.
 *
 * Deliberately a local copy rather than an import of either original — see
 * the note on `extractPlainText` in the git history of this file for why
 * `shared/` code stays dependency-free here.
 */
export function extractPlainText(doc: ProsekitNode | null | undefined): string {
	const lines: string[] = [];
	let current = "";

	function walk(node: ProsekitNode | null | undefined): void {
		if (!node || typeof node !== "object") return;
		if (typeof node.text === "string") {
			current += node.text;
			return;
		}
		if (node.type === "hardBreak") {
			current += "\n";
			return;
		}
		if (Array.isArray(node.content)) {
			for (const child of node.content) walk(child);
			if (node.type !== undefined) {
				lines.push(current);
				current = "";
			}
		}
	}

	walk(doc);
	if (current) lines.push(current);

	return lines.filter((line) => line.length > 0).join("\n\n");
}

import type { ProsekitDoc } from "../types";

/**
 * Wraps plain text into a minimal Prosekit/ProseMirror document — one
 * paragraph per blank-line-separated block, no rich formatting.
 *
 * Task/comment *creation* accepts Markdown directly (the backend converts it
 * server-side via `markdownToProsekitJSON`). The *update* endpoints instead
 * require an already-parsed Prosekit document and do no conversion of their
 * own — and that parser lives in `apps/backend` (a Bun-only module), not
 * something this CLI can reach. So updates only support plain text for now;
 * Markdown syntax (headers, bold, lists, ...) will show up as literal text.
 */
export function toPlainProsekitDoc(text: string): ProsekitDoc {
	const blocks = text
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);

	if (blocks.length === 0) {
		return { type: "doc", content: [{ type: "paragraph" }] };
	}

	return {
		type: "doc",
		content: blocks.map((block) => ({ type: "paragraph", content: [{ type: "text", text: block }] })),
	};
}

/**
 * Renders a Prosekit/ProseMirror document (as returned by the API, e.g.
 * `task.description`) down to plain text for terminal display. Every node
 * with its own `content` array is treated as a block boundary (paragraph,
 * heading, list item, ...) — good enough to read, not a real renderer, so
 * inline marks (bold, links, code) are dropped rather than reproduced.
 */
export function renderProsekitPlainText(doc: unknown): string {
	const lines: string[] = [];
	let current = "";

	function walk(node: unknown): void {
		if (!node || typeof node !== "object") return;
		const n = node as { type?: string; text?: string; content?: unknown[] };

		if (typeof n.text === "string") {
			current += n.text;
			return;
		}

		if (Array.isArray(n.content)) {
			for (const child of n.content) walk(child);
			if (n.type !== undefined) {
				lines.push(current);
				current = "";
			}
		}
	}

	walk(doc);
	if (current) lines.push(current);

	return lines.filter((line) => line.length > 0).join("\n\n");
}

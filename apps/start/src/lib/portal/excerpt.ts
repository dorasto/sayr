import { extractTaskText } from "@repo/util";

/** Default excerpt length shown under a post title on the board. */
export const EXCERPT_LENGTH = 240;

interface ExcerptNode {
	type?: string;
	text?: string;
	marks?: Array<{ type: string }>;
	content?: ExcerptNode[];
}

/** Block types that never contribute to an excerpt. */
const SKIPPED_BLOCKS = new Set(["heading", "horizontalRule", "image", "codeBlock"]);

/** Issue-template prompt lines (compared lower-cased, without a trailing colon). */
const KNOWN_PROMPTS = new Set([
	"steps to reproduce",
	"expected behavior",
	"expected behaviour",
	"actual behavior",
	"actual behaviour",
	"environment",
	"browser / os",
	"browser/os",
	"browser",
	"os",
	"version",
	"describe the feature",
	"describe the bug",
	"describe the problem",
	"describe the idea",
	"additional context",
	"screenshots",
	"what happened",
	"what did you expect to happen",
	"why it matters",
	"further requirements",
]);

function hasMark(node: ExcerptNode, mark: string): boolean {
	return Array.isArray(node.marks) && node.marks.some((m) => m.type === mark);
}

function normalizePrompt(text: string): string {
	return text.trim().replace(/\s+/g, " ").replace(/:$/, "").trim().toLowerCase();
}

/** A short label-ish line such as "Steps to reproduce:" that only exists to prompt the author. */
function isPromptLine(text: string): boolean {
	const trimmed = text.trim();
	if (KNOWN_PROMPTS.has(normalizePrompt(trimmed))) return true;
	return trimmed.endsWith(":") && trimmed.length <= 60 && !/[.!?]\s/.test(trimmed);
}

function paragraphText(content: ExcerptNode[]): string {
	return content.map((n) => (n.type === "text" && typeof n.text === "string" ? n.text : "")).join("");
}

/**
 * Flattens a ProseKit doc into a list of top-level paragraphs that are worth showing in an excerpt:
 * headings, hr, code/images, empty paragraphs, template placeholder text and known issue-template prompt
 * lines are dropped. Containers (lists, quotes…) are flattened so `extractTaskText` joins their paragraphs with
 * a space instead of fusing them.
 */
function collectParagraphs(node: ExcerptNode | undefined, out: ExcerptNode[]): void {
	if (!node || typeof node !== "object" || !node.type) return;
	if (SKIPPED_BLOCKS.has(node.type)) return;

	if (node.type === "paragraph") {
		const inline = (node.content ?? []).filter((child) => !hasMark(child, "templatePlaceholder"));
		const text = paragraphText(inline);
		if (text.trim().length === 0 || isPromptLine(text)) return;
		out.push({ type: "paragraph", content: inline });
		return;
	}

	if (Array.isArray(node.content)) {
		for (const child of node.content) collectParagraphs(child, out);
	}
}

function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	const slice = text.slice(0, maxLength);
	const lastSpace = slice.lastIndexOf(" ");
	const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
	return `${cut.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/**
 * Builds the ~240-character list excerpt for a post from its ProseKit description JSON. Wraps `extractTaskText`
 * from `@repo/util` after filtering out structure that makes for a poor preview (see `collectParagraphs`).
 */
export function buildExcerpt(description: unknown, maxLength: number = EXCERPT_LENGTH): string {
	if (!description || typeof description !== "object") return "";
	const doc = description as ExcerptNode;
	if (doc.type !== "doc" || !Array.isArray(doc.content)) return "";

	const paragraphs: ExcerptNode[] = [];
	for (const child of doc.content) collectParagraphs(child, paragraphs);

	const text = extractTaskText({ type: "doc", content: paragraphs }).replace(/\s+/g, " ").trim();
	return truncate(text, maxLength);
}

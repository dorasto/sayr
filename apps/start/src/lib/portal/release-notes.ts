import { linkifyTaskKeys } from "./task-keys";

export type ReleaseNoteInline =
	| { type: "text"; text: string }
	| { type: "bold"; text: string }
	| { type: "code"; text: string }
	| { type: "link"; text: string; href: string }
	| {
			type: "taskKey";
			/** Display key via `formatTaskKey`, e.g. "SAY-69" (no parentheses). */
			key: string;
			/** The raw numeric short id for route params. */
			shortId: number;
	  };

export type ReleaseNoteBlock =
	| { type: "heading"; text: string }
	| { type: "paragraph"; inline: ReleaseNoteInline[] }
	| { type: "list"; items: ReleaseNoteInline[][] };

// [text](href "title") | **bold** | `code`
const INLINE_PATTERN = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;
// The serializer escapes markdown punctuation with a backslash; undo it for display.
const ESCAPED = /\\([\\`*_{}[\]()#+\-.!|~<>])/g;

const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const FENCE = /^\s*(```|~~~)/;
const SKIPPED_LINE = /^\s*(?:<(?:img|video)\b|\|)/i;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

function unescapeMarkdown(text: string): string {
	return text.replace(ESCAPED, "$1");
}

function textSegments(text: string, orgPrefix: string): ReleaseNoteInline[] {
	return linkifyTaskKeys(unescapeMarkdown(text), orgPrefix).map((segment) =>
		segment.type === "taskKey"
			? { type: "taskKey", key: segment.key, shortId: segment.shortId }
			: { type: "text", text: segment.text }
	);
}

/**
 * Inline markdown (links, bold, code) plus `(PREFIX-123)` task keys for the org's own prefix. Links with an unsafe
 * scheme render as plain text.
 */
export function parseReleaseInline(raw: string, orgPrefix: string): ReleaseNoteInline[] {
	const result: ReleaseNoteInline[] = [];
	let cursor = 0;

	for (const match of raw.matchAll(INLINE_PATTERN)) {
		const index = match.index ?? 0;
		if (index > cursor) result.push(...textSegments(raw.slice(cursor, index), orgPrefix));

		const [, linkText, href, bold, code] = match;
		if (linkText !== undefined && href !== undefined) {
			if (SAFE_HREF.test(href)) result.push({ type: "link", text: unescapeMarkdown(linkText), href });
			else result.push(...textSegments(linkText, orgPrefix));
		} else if (bold !== undefined) {
			result.push({ type: "bold", text: unescapeMarkdown(bold) });
		} else if (code !== undefined) {
			result.push({ type: "code", text: code });
		}
		cursor = index + match[0].length;
	}

	if (cursor < raw.length) result.push(...textSegments(raw.slice(cursor), orgPrefix));
	return result;
}

/** Plain text of parsed inline tokens (task keys come back as `SAY-69`). */
export function inlineToPlainText(inline: ReadonlyArray<ReleaseNoteInline>): string {
	return inline.map((token) => (token.type === "taskKey" ? token.key : token.text)).join("");
}

/**
 * Parses the release notes markdown the public API returns (`descriptionMarkdown`) into headings, paragraphs and
 * bullet lists. Nested lists are flattened; code blocks, tables, images and rules are dropped.
 */
export function parseReleaseNotes(markdown: string | null | undefined, orgPrefix: string): ReleaseNoteBlock[] {
	if (!markdown) return [];

	const blocks: ReleaseNoteBlock[] = [];
	let paragraph: string[] = [];
	let currentList: string[] | null = null;
	let inFence = false;

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		blocks.push({ type: "paragraph", inline: parseReleaseInline(paragraph.join(" "), orgPrefix) });
		paragraph = [];
	};

	const flushList = () => {
		if (!currentList) return;
		blocks.push({ type: "list", items: currentList.map((item) => parseReleaseInline(item, orgPrefix)) });
		currentList = null;
	};

	for (const line of markdown.split(/\r?\n/)) {
		if (FENCE.test(line)) {
			flushParagraph();
			flushList();
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		if (line.trim() === "") {
			// A blank line ends a paragraph but not a (loose) list: the next bullet continues it.
			flushParagraph();
			continue;
		}

		if (RULE.test(line) || SKIPPED_LINE.test(line)) {
			flushParagraph();
			flushList();
			continue;
		}

		const heading = HEADING.exec(line);
		if (heading) {
			flushParagraph();
			flushList();
			const text = heading[1] ?? "";
			if (text) blocks.push({ type: "heading", text: unescapeMarkdown(text) });
			continue;
		}

		const item = LIST_ITEM.exec(line);
		if (item) {
			flushParagraph();
			if (!currentList) currentList = [];
			currentList.push(item[1] ?? "");
			continue;
		}

		const content = line.replace(/^\s*>\s?/, "").trim();
		if (currentList && /^\s+/.test(line)) {
			// Indented continuation of the previous bullet.
			currentList[currentList.length - 1] = `${currentList[currentList.length - 1]} ${content}`;
			continue;
		}

		flushList();
		paragraph.push(content);
	}

	flushParagraph();
	flushList();
	return blocks;
}

const SENTENCE_END = /^(.+?[.!?])(?:\s|$)/;

/**
 * The first sentence of the release notes (first paragraph, else first bullet), for the upcoming card's summary.
 * Truncated with an ellipsis past `maxLength`. Empty when there is no text.
 */
export function getFirstSentence(markdown: string | null | undefined, maxLength = 200): string {
	const blocks = parseReleaseNotes(markdown, "");
	let text = "";
	for (const block of blocks) {
		if (block.type === "paragraph") {
			text = inlineToPlainText(block.inline);
			break;
		}
		if (block.type === "list" && block.items[0]) {
			text = inlineToPlainText(block.items[0]);
			break;
		}
	}

	text = text.trim();
	if (!text) return "";

	const sentence = SENTENCE_END.exec(text)?.[1] ?? text;
	if (sentence.length <= maxLength) return sentence;
	return `${sentence.slice(0, maxLength - 1).trimEnd()}…`;
}

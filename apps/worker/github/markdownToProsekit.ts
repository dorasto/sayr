//@ts-expect-error
import MarkdownIt from "markdown-it";
import { MarkdownParser } from "prosemirror-markdown";
import type { schema } from "@repo/database";
import { db } from "@repo/database";
import { formatTaskKey } from "@repo/util";
import { and, eq, inArray } from "drizzle-orm";
import { basicGithubSchema } from "./basicGithubSchema";

/**
 * GitHub / Linear-style Markdown
 * - No images
 * - No HTML
 * - Text-only, safe
 */
const md = new MarkdownIt({
	html: false, // 🚫 disable HTML entirely
	linkify: true,
	breaks: true,
});
/**
 * Markdown → ProseKit (ProseMirror) parser
 */
const prosekitMarkdownParser = new MarkdownParser(basicGithubSchema, md, {
	// --------------------
	// Block nodes
	// --------------------
	paragraph: { block: "paragraph" },
	blockquote: { block: "blockquote" },

	heading: {
		block: "heading",
		getAttrs: (tok) => ({
			level: Number(tok.tag.slice(1)),
		}),
	},

	bullet_list: { block: "bulletList" },

	ordered_list: {
		block: "orderedList",
		getAttrs: (tok) => ({
			start: tok.attrGet("start") ? Number(tok.attrGet("start")) : 1,
		}),
	},

	list_item: { block: "listItem" },

	fence: {
		block: "codeBlock",
		getAttrs: (tok) => ({
			language: tok.info || null,
		}),
	},

	code_block: {
		block: "codeBlock",
		getAttrs: (tok) => ({
			language: tok.info || null,
		}),
	},

	hr: { node: "horizontalRule" },
	hardbreak: { node: "hardBreak" },

	// --------------------
	// Marks
	// --------------------
	em: { mark: "italic" },
	strong: { mark: "bold" },
	s: { mark: "strike" },
	code_inline: { mark: "code" },

	link: {
		mark: "link",
		getAttrs: (tok) => ({
			href: tok.attrGet("href"),
			title: tok.attrGet("title"),
		}),
	},
});
function stripGithubImages(markdown: string): string {
	return markdown.replace(/<img\b[^>]*>/gi, "");
}

/**
 * Matches a bare GitHub issue cross-reference like `#10` — GitHub's own
 * autolinking of these is a backend behavior applied to rendered HTML, not
 * real markdown syntax, so a generic parser has no reason to treat it as
 * anything but plain text. Requires the `#` to be preceded by start-of-text,
 * whitespace, or an opening paren (so `word#10` and hex-ish tokens don't
 * match), and the digits to end on a word boundary (so `#10.`/`#10,` match
 * but `#10abc` doesn't).
 */
const ISSUE_REFERENCE_PATTERN = /(^|[\s(])#(\d+)\b/g;

type MentionResolutionContext = {
	organizationId: string;
	repositoryId: string;
};

/**
 * Finds every `#N` reference across the doc, batch-resolves them against
 * `githubIssue` (only issue numbers already linked to a Sayr task resolve —
 * everything else is left as plain text), then splices real `mention` nodes
 * in wherever a match resolved. Two passes: collect first (no DB calls
 * inside the tree walk), then a synchronous splice using the resolved map.
 */
async function resolveGithubIssueReferences(
	doc: schema.NodeJSON,
	context: MentionResolutionContext
): Promise<schema.NodeJSON> {
	const referencedNumbers = new Set<number>();
	collectIssueNumbers(doc, referencedNumbers);
	if (referencedNumbers.size === 0) return doc;

	const linked = await db.query.githubIssue.findMany({
		where: (gi) =>
			and(
				eq(gi.organizationId, context.organizationId),
				eq(gi.repositoryId, context.repositoryId),
				inArray(gi.issueNumber, [...referencedNumbers])
			),
		with: { task: { columns: { id: true, shortId: true } } },
	});

	const org = linked.length
		? await db.query.organization.findFirst({
				where: (o) => eq(o.id, context.organizationId),
				columns: { shortId: true },
			})
		: null;
	if (!org) return doc;

	const resolved = new Map<number, { id: string; value: string }>();
	for (const issue of linked) {
		if (!issue.task) continue;
		resolved.set(issue.issueNumber, {
			id: issue.task.id,
			value: formatTaskKey(org.shortId, issue.task.shortId),
		});
	}
	if (resolved.size === 0) return doc;

	return spliceMentions(doc, resolved) as schema.NodeJSON;
}

function collectIssueNumbers(node: unknown, into: Set<number>): void {
	if (!node || typeof node !== "object") return;
	const n = node as { type?: string; text?: string; content?: unknown[] };

	if (n.type === "text" && typeof n.text === "string") {
		for (const match of n.text.matchAll(ISSUE_REFERENCE_PATTERN)) {
			const num = Number(match[2]);
			if (!Number.isNaN(num)) into.add(num);
		}
		return;
	}

	if (Array.isArray(n.content)) {
		for (const child of n.content) collectIssueNumbers(child, into);
	}
}

function spliceMentions(node: unknown, resolved: Map<number, { id: string; value: string }>): unknown {
	if (!node || typeof node !== "object") return node;
	const n = node as { type?: string; text?: string; marks?: unknown[]; content?: unknown[] };

	// Never splice inside inline code or code blocks — a `#10` there is
	// source/literal text, not a reference.
	const hasCodeMark = Array.isArray(n.marks) && n.marks.some((m) => (m as { type?: string })?.type === "code");
	if (n.type === "text" && typeof n.text === "string" && !hasCodeMark && n.text.includes("#")) {
		return splitTextNode(n, resolved);
	}

	if (n.type === "codeBlock") return n;

	if (Array.isArray(n.content)) {
		return {
			...n,
			content: n.content.flatMap((child) => {
				const result = spliceMentions(child, resolved);
				return Array.isArray(result) ? result : [result];
			}),
		};
	}

	return n;
}

function splitTextNode(
	textNode: { type?: string; text?: string; marks?: unknown[] },
	resolved: Map<number, { id: string; value: string }>
): unknown[] {
	const text = textNode.text ?? "";
	const out: unknown[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(ISSUE_REFERENCE_PATTERN)) {
		const num = Number(match[2]);
		const task = resolved.get(num);
		if (!task || match.index === undefined) continue;

		const leading = match[1] ?? "";
		const matchStart = match.index + leading.length;
		const matchEnd = match.index + match[0].length;

		if (matchStart > lastIndex) {
			out.push({ ...textNode, text: text.slice(lastIndex, matchStart) });
		}
		out.push({
			type: "mention",
			attrs: { id: task.id, value: task.value, kind: "task" },
		});
		lastIndex = matchEnd;
	}

	if (lastIndex < text.length) {
		out.push({ ...textNode, text: text.slice(lastIndex) });
	}

	return out.length ? out : [textNode];
}

/**
 * Convert Markdown → ProseKit JSON. `context`, when provided, additionally
 * resolves bare `#N` GitHub issue references into real Sayr task mentions
 * (see resolveGithubIssueReferences) — omit it to skip that step entirely.
 */
export async function markdownToProsekitJSON(
	markdown: string,
	context?: MentionResolutionContext
): Promise<schema.NodeJSON> {
	try {
		const sanitized = stripGithubImages(markdown);

		const doc = prosekitMarkdownParser.parse(sanitized);
		const json = doc.toJSON() as schema.NodeJSON;

		if (!context) return json;
		return await resolveGithubIssueReferences(json, context);
	} catch (error) {
		console.error("Markdown → ProseKit conversion failed:", error);
		return {
			type: "doc",
			content: [],
		};
	}
}

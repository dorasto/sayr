import { auth, db, schema } from "@repo/database";
import { formatTaskKey, generateSlug } from "@repo/util";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Turns task / user / category references in text that came in as Markdown (MCP, /v1/me API, CLI)
 * into the same `mention` nodes the editor's `#` / `@` / `!` menus insert, so they render as badges
 * (components/prosekit/ui/mention-view.tsx resolves them by `id`) and notifications see `@` mentions.
 *
 *   SAY-12 / #SAY-12   → { kind: "task",     id: task.id,     value: "SAY-12" }        (this org's tasks)
 *   @tommerty          → { kind: "user",     id: user.id,     value: "@tommerty" }     (this org's members, by user.name)
 *   !Bug report        → { kind: "category", id: category.id, value: "!Bug report" }   (by name, spaces allowed, or
 *   !bug-report                                                                         by the name's slug)
 *
 * The `value`s are exactly what the editor stores and what prosekitJSONToMarkdown writes back out,
 * so a description read over MCP and written back keeps its mentions. Only plain text is scanned:
 * code, code blocks, links and existing mentions are left alone, and anything that doesn't match a
 * real record in the org stays as text. Only for Markdown input — editor content already has nodes.
 */

export interface MentionLookup {
	orgShortId: string;
	/** Task shortId → task id. */
	tasks: ReadonlyMap<number, string>;
	users: readonly { id: string; name: string }[];
	categories: readonly { id: string; name: string }[];
}

type MentionAttrs = { id: string; value: string; kind: "task" | "user" | "category" };

const TASK_KEY = /#?([A-Za-z][A-Za-z0-9]*)-(\d+)/y;
const USER_TOKEN = /@([A-Za-z0-9_.-]+)/y;
const SLUG_TOKEN = /!([a-z0-9]+(?:-[a-z0-9]+)*)/iy;
/** What may sit right before a reference: start of text, whitespace, or opening punctuation. */
const BEFORE = /[\s([{"'“‘,;:]/;
const isWordChar = (char: string | undefined) => char !== undefined && /[A-Za-z0-9_]/.test(char);
/** A reference must not run straight into more of a word ("SAY-12a", "@tom2", "!feature-x"). */
const continuesWord = (text: string, at: number) =>
	isWordChar(text[at]) || (text[at] === "-" && isWordChar(text[at + 1]));

function isScannable(node: schema.NodeJSON): boolean {
	return node.type === "text" && !node.marks?.some((mark) => mark.type === "code" || mark.type === "link");
}

/** Every text node that can hold references (skips code blocks, code / link marks). */
function collectTexts(node: schema.NodeJSON, out: string[] = []): string[] {
	if (node.type === "codeBlock") return out;
	if (isScannable(node) && node.text) out.push(node.text);
	for (const child of node.content ?? []) collectTexts(child, out);
	return out;
}

/** Longest `candidates` name that `text` continues with at `from`, case-insensitively, ending at a word boundary. */
function matchName<T extends { name: string }>(text: string, from: number, candidates: readonly T[]): T | undefined {
	const rest = text.slice(from).toLowerCase();
	let best: T | undefined;
	for (const candidate of candidates) {
		const name = candidate.name.toLowerCase();
		if (!name || !rest.startsWith(name) || continuesWord(rest, name.length)) continue;
		if (!best || name.length > best.name.length) best = candidate;
	}
	return best;
}

function matchAt(text: string, i: number, lookup: MentionLookup): { length: number; attrs: MentionAttrs } | null {
	if (i > 0 && !BEFORE.test(text[i - 1] as string)) return null;
	const char = text[i];

	if (char === "#" || /[A-Za-z]/.test(char as string)) {
		TASK_KEY.lastIndex = i;
		const m = TASK_KEY.exec(text);
		if (m && !continuesWord(text, i + m[0].length) && m[1]?.toUpperCase() === lookup.orgShortId.toUpperCase()) {
			const shortId = Number(m[2]);
			const id = lookup.tasks.get(shortId);
			if (id)
				return {
					length: m[0].length,
					attrs: { kind: "task", id, value: formatTaskKey(lookup.orgShortId, shortId) },
				};
		}
		return null;
	}

	if (char === "@") {
		const user = matchName(text, i + 1, lookup.users);
		if (user) return { length: 1 + user.name.length, attrs: { kind: "user", id: user.id, value: `@${user.name}` } };
		return null;
	}

	if (char === "!") {
		const byName = matchName(text, i + 1, lookup.categories);
		if (byName) {
			return {
				length: 1 + byName.name.length,
				attrs: { kind: "category", id: byName.id, value: `!${byName.name}` },
			};
		}
		SLUG_TOKEN.lastIndex = i;
		const m = SLUG_TOKEN.exec(text);
		if (m && !continuesWord(text, i + m[0].length)) {
			const slug = m[1]?.toLowerCase();
			const bySlug = lookup.categories.find((category) => generateSlug(category.name) === slug);
			if (bySlug) {
				return { length: m[0].length, attrs: { kind: "category", id: bySlug.id, value: `!${bySlug.name}` } };
			}
		}
	}
	return null;
}

/** One text node → text / mention nodes. Returns null when it has no references (keep the node as is). */
function splitText(node: schema.NodeJSON, lookup: MentionLookup): schema.NodeJSON[] | null {
	const text = node.text ?? "";
	const parts: schema.NodeJSON[] = [];
	let last = 0;
	for (let i = 0; i < text.length; i++) {
		const match = matchAt(text, i, lookup);
		if (!match) continue;
		if (i > last) parts.push({ ...node, text: text.slice(last, i) });
		parts.push({ type: "mention", attrs: match.attrs, ...(node.marks?.length ? { marks: node.marks } : {}) });
		last = i + match.length;
		i = last - 1;
	}
	if (parts.length === 0) return null;
	if (last < text.length) parts.push({ ...node, text: text.slice(last) });
	return parts;
}

/** Pure part of resolveMarkdownMentions: rewrites the doc against already-loaded records. */
export function applyMentionLookup(node: schema.NodeJSON, lookup: MentionLookup): schema.NodeJSON {
	if (node.type === "codeBlock" || !node.content) return node;
	const content = node.content.flatMap((child) =>
		isScannable(child) ? (splitText(child, lookup) ?? [child]) : [applyMentionLookup(child, lookup)]
	);
	return { ...node, content };
}

export async function resolveMarkdownMentions(doc: schema.NodeJSON, orgId: string): Promise<schema.NodeJSON> {
	const texts = collectTexts(doc);
	const joined = texts.join("\n");
	const wantsTasks = /\d/.test(joined) && /-/.test(joined);
	const wantsUsers = joined.includes("@");
	const wantsCategories = joined.includes("!");
	if (!wantsTasks && !wantsUsers && !wantsCategories) return doc;

	const organization = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
		columns: { shortId: true },
	});
	if (!organization) return doc;

	// Only the task numbers written with this org's key, so the lookup stays one small query.
	const shortIds = new Set<number>();
	if (wantsTasks) {
		const orgKey = organization.shortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const key = new RegExp(`(?:^|[^A-Za-z0-9])#?${orgKey}-(\\d+)`, "gi");
		for (const text of texts) for (const m of text.matchAll(key)) shortIds.add(Number(m[1]));
	}

	const [tasks, users, categories] = await Promise.all([
		shortIds.size
			? db
					.select({ id: schema.task.id, shortId: schema.task.shortId })
					.from(schema.task)
					.where(and(eq(schema.task.organizationId, orgId), inArray(schema.task.shortId, [...shortIds])))
			: [],
		wantsUsers
			? db
					.select({ id: auth.user.id, name: auth.user.name })
					.from(schema.member)
					.innerJoin(auth.user, eq(schema.member.userId, auth.user.id))
					.where(eq(schema.member.organizationId, orgId))
			: [],
		wantsCategories
			? db
					.select({ id: schema.category.id, name: schema.category.name })
					.from(schema.category)
					.where(eq(schema.category.organizationId, orgId))
			: [],
	]);

	return applyMentionLookup(doc, {
		orgShortId: organization.shortId,
		tasks: new Map(tasks.flatMap((task) => (task.shortId === null ? [] : [[task.shortId, task.id] as const]))),
		users,
		categories,
	});
}

/** resolveMarkdownMentions on a parsed input's Markdown fields (`description` / `content`), when present. */
export async function withResolvedMentions<T extends { description?: schema.NodeJSON; content?: schema.NodeJSON }>(
	value: T,
	orgId: string
): Promise<T> {
	const [description, content] = await Promise.all([
		value.description ? resolveMarkdownMentions(value.description, orgId) : undefined,
		value.content ? resolveMarkdownMentions(value.content, orgId) : undefined,
	]);
	return { ...value, ...(description && { description }), ...(content && { content }) };
}

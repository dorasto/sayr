import type { NodeJSON } from "prosekit/core";
import { DUPLICATE_LIMIT, DUPLICATE_MIN_TITLE_LENGTH, type DuplicateCandidate, findDuplicates } from "./duplicates";

/** Category names the new post form puts first, in this order, when the org has them. */
const PROMOTED_CATEGORY_NAMES: ReadonlyArray<string> = ["feature request", "bug", "feedback"];

/** How many category chips sit in the row before the rest move into the "Other category" menu. */
export const CATEGORY_CHIP_COUNT = 3;

/** Case-insensitive, trimmed, singular form of a category name, so "Bugs" matches "bug". */
function normaliseCategoryName(name: string): string {
	return name.trim().toLowerCase().replace(/s$/, "");
}

export interface CategoryChipSplit<T> {
	/** Shown as chips. */
	chips: T[];
	/** Everything else, for the "Other category" menu. */
	more: T[];
}

/**
 * Picks the category chips for the new post form: Feature request, Bug and Feedback by name when the org has them, then
 * (if fewer than three were found) the first remaining categories in their original order. Everything else goes to
 * `more`.
 */
export function splitCategoryChips<T extends { id: string; name: string }>(
	categories: ReadonlyArray<T>,
	chipCount: number = CATEGORY_CHIP_COUNT
): CategoryChipSplit<T> {
	const chips: T[] = [];
	for (const promoted of PROMOTED_CATEGORY_NAMES) {
		const match = categories.find(
			(category) => normaliseCategoryName(category.name) === normaliseCategoryName(promoted)
		);
		if (match && !chips.includes(match)) chips.push(match);
	}
	for (const category of categories) {
		if (chips.length >= chipCount) break;
		if (!chips.includes(category)) chips.push(category);
	}
	const chipIds = new Set(chips.map((category) => category.id));
	return { chips: chips.slice(0, chipCount), more: categories.filter((category) => !chipIds.has(category.id)) };
}

/** Priorities a visitor can pick on the new post form, in display order (same values the API accepts). */
export const POST_PRIORITIES = [
	{ value: "none", label: "No priority" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "urgent", label: "Urgent" },
] as const;

export type PostPriority = (typeof POST_PRIORITIES)[number]["value"];

export const DEFAULT_POST_PRIORITY: PostPriority = "none";

/** Narrows an unknown value (stored draft, template priority) to a priority the form offers. */
export function isPostPriority(value: unknown): value is PostPriority {
	return POST_PRIORITIES.some((priority) => priority.value === value);
}

/** What the new post form keeps while the visitor logs in or wanders off to read a similar post. */
export interface NewPostDraft {
	title: string;
	/** ProseKit document JSON (blob image URLs are only valid in the tab that made them, so they are dropped on save). */
	description: NodeJSON | undefined;
	categoryId: string | null;
	priority: PostPriority;
	labelIds: string[];
	/** The template the post started from. Kept so a template-required board does not ask again after a login round trip. */
	templateId: string | null;
}

/** A draft holding only `title`, everything else at its default. */
export function titleOnlyDraft(title: string): NewPostDraft {
	return {
		title,
		description: undefined,
		categoryId: null,
		priority: DEFAULT_POST_PRIORITY,
		labelIds: [],
		templateId: null,
	};
}

/** `sessionStorage` key for an org's draft. Per org, per tab; cleared on a successful post. */
export function newPostDraftKey(orgId: string): string {
	return `portal:new-post-draft:${orgId}`;
}

/** Narrows an unknown JSON value (stored draft, template description) to a ProseKit document. */
export function isDocJson(value: unknown): value is NodeJSON {
	return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "doc";
}

/** Whether a ProseKit document holds anything a reader would see (text, an image, a mention...), not just empty blocks. */
export function docHasContent(doc: NodeJSON | undefined): boolean {
	if (!doc) return false;
	if (doc.type === "text") return (doc.text ?? "").trim().length > 0;
	if (doc.type === "image" || doc.type === "video" || doc.type === "gif" || doc.type === "mention") return true;
	return (doc.content ?? []).some((child) => docHasContent(child));
}

/** Copy of `doc` without `blob:` media nodes, which do not survive a reload. */
function stripBlobMedia(node: NodeJSON): NodeJSON | null {
	const isMedia = node.type === "image" || node.type === "video";
	const src = node.attrs?.src;
	if (isMedia && typeof src === "string" && src.startsWith("blob:")) return null;
	if (!node.content) return node;
	const content = node.content.map(stripBlobMedia).filter((child): child is NodeJSON => child !== null);
	return { ...node, content };
}

/** True when there is nothing worth keeping. */
export function isDraftEmpty(draft: NewPostDraft): boolean {
	return (
		!draft.title.trim() &&
		!docHasContent(draft.description) &&
		!draft.categoryId &&
		draft.priority === DEFAULT_POST_PRIORITY &&
		draft.labelIds.length === 0 &&
		!draft.templateId
	);
}

/** Draft as a JSON string for `sessionStorage`, or `null` when it is empty (the caller should remove the key). */
export function serialiseDraft(draft: NewPostDraft): string | null {
	const description = draft.description ? stripBlobMedia(draft.description) : null;
	const cleaned: NewPostDraft = {
		...draft,
		description: description && docHasContent(description) ? description : undefined,
	};
	if (isDraftEmpty(cleaned)) return null;
	return JSON.stringify(cleaned);
}

/** Reads a stored draft back, tolerating missing or corrupted storage (returns `null`). */
export function parseDraft(raw: string | null | undefined): NewPostDraft | null {
	if (!raw) return null;
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	const draft: NewPostDraft = {
		title: typeof record.title === "string" ? record.title : "",
		description: isDocJson(record.description) ? record.description : undefined,
		categoryId: typeof record.categoryId === "string" ? record.categoryId : null,
		priority: isPostPriority(record.priority) ? record.priority : DEFAULT_POST_PRIORITY,
		labelIds: Array.isArray(record.labelIds)
			? record.labelIds.filter((id): id is string => typeof id === "string")
			: [],
		templateId: typeof record.templateId === "string" ? record.templateId : null,
	};
	return isDraftEmpty(draft) ? null : draft;
}

/**
 * The draft the form opens with. A `?title=` that differs from the stored draft's title means the visitor started a
 * fresh post from the search box or the board composer, so it wins and the stored details are not carried over.
 */
export function resolveInitialDraft(
	prefillTitle: string | undefined,
	stored: NewPostDraft | null
): NewPostDraft | null {
	const prefill = prefillTitle?.trim();
	if (!prefill) return stored;
	if (stored && stored.title.trim() === prefill) return stored;
	return titleOnlyDraft(prefill);
}

/**
 * Similar-post suggestions for a draft title: the client-side scorer over every post we know about (the loaded board
 * plus the server's `q` hits, deduped by id with loaded copies first), then any server hit the scorer did not rate
 * (a description-only match) after them by votes. Canceled posts are left out. Capped at `limit`.
 */
export function mergeSimilarPosts<T extends DuplicateCandidate>(
	title: string,
	loaded: ReadonlyArray<T>,
	server: ReadonlyArray<T>,
	limit: number = DUPLICATE_LIMIT
): T[] {
	if (title.trim().length < DUPLICATE_MIN_TITLE_LENGTH) return [];

	const byId = new Map<string, T>();
	for (const task of [...loaded, ...server]) {
		if (!byId.has(task.id)) byId.set(task.id, task);
	}
	const candidates = [...byId.values()];

	const scored = findDuplicates(title, candidates, candidates.length).map((match) => match.task);
	const scoredIds = new Set(scored.map((task) => task.id));
	const serverOnly = [...byId.values()]
		.filter(
			(task) => !scoredIds.has(task.id) && task.status !== "canceled" && server.some((hit) => hit.id === task.id)
		)
		.sort((a, b) => b.voteCount - a.voteCount);

	return [...scored, ...serverOnly].slice(0, limit);
}

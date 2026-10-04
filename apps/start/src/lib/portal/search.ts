import { getReleaseDate } from "./status";
import type { PortalDateInput } from "./time";

/** How long typing settles before the server is asked. */
export const SEARCH_DEBOUNCE_MS = 150;
/** Shorter queries are answered from the cache only (a one-letter `q` matches nearly every post). */
export const SEARCH_SERVER_MIN_LENGTH = 2;
/** Post results shown (the internal list endpoint is asked for the same number). */
export const SEARCH_POST_LIMIT = 8;
export const SEARCH_RELEASE_LIMIT = 5;
/** Empty query: most voted open posts and latest releases. */
export const SEARCH_POPULAR_LIMIT = 5;
export const SEARCH_LATEST_RELEASE_LIMIT = 3;
const MAX_QUERY_LENGTH = 200;

/** Trims, collapses whitespace and caps the length of what the user typed. */
export function normalizeSearchQuery(raw: string): string {
	return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

/** Lower-cased, de-duplicated words of a query, longest first. */
export function getSearchTerms(query: string): string[] {
	const words = normalizeSearchQuery(query).toLowerCase().split(" ").filter(Boolean);
	return [...new Set(words)].sort((a, b) => b.length - a.length);
}

export interface HighlightSegment {
	text: string;
	match: boolean;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits `text` into runs, flagging the parts that match any word of the query (case-insensitive). */
export function splitHighlight(text: string, query: string): HighlightSegment[] {
	const terms = getSearchTerms(query);
	if (!text || terms.length === 0) return text ? [{ text, match: false }] : [];

	const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "giu");
	const segments: HighlightSegment[] = [];
	let cursor = 0;
	for (const hit of text.matchAll(pattern)) {
		const start = hit.index ?? 0;
		if (hit[0].length === 0) continue;
		if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
		segments.push({ text: hit[0], match: true });
		cursor = start + hit[0].length;
	}
	if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
	return segments;
}

/** The structural part of a post the palette needs (satisfied by `schema.TaskWithLabels`). */
export interface SearchPostLike {
	id: string;
	shortId?: number | null;
	title?: string | null;
	status: string;
	voteCount: number;
}

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

/**
 * How well a post matches the query, matching title and task key only: 0 = no match, 100 = the key (or bare number),
 * 80 = title starts with the query, 60 = every word starts a title word, 40 = every word appears somewhere.
 */
export function scorePost(post: SearchPostLike, query: string, key: string): number {
	const normalized = normalizeSearchQuery(query).toLowerCase();
	const terms = getSearchTerms(query);
	if (terms.length === 0) return 0;

	const keyLower = key.toLowerCase();
	if (normalized === keyLower) return 100;
	if (/^\d+$/.test(normalized) && post.shortId != null && String(post.shortId) === normalized) return 100;

	const title = (post.title ?? "").toLowerCase();
	if (!terms.every((term) => title.includes(term) || keyLower.includes(term))) return 0;
	if (title.startsWith(normalized)) return 80;

	const words = title.split(WORD_SPLIT);
	if (terms.every((term) => words.some((word) => word.startsWith(term)))) return 60;
	return 40;
}

interface MergePostsArgs<T extends SearchPostLike> {
	query: string;
	/** Matches pulled from board lists already in the react-query cache (instant, title/key only). */
	cached: ReadonlyArray<T>;
	/** Hits from the server's `q` search (title + description). */
	server: ReadonlyArray<T>;
	/**
	 * `false` while the server rows still belong to an earlier keystroke (kept on screen to avoid flicker): those are
	 * then only kept if they still match the current title, since description hits can't be re-checked client-side.
	 */
	serverIsFresh: boolean;
	keyOf: (post: T) => string;
	limit?: number;
}

/** Merges cached and server matches (de-duplicated by id), best match first, then most voted. */
export function mergePostResults<T extends SearchPostLike>({
	query,
	cached,
	server,
	serverIsFresh,
	keyOf,
	limit = SEARCH_POST_LIMIT,
}: MergePostsArgs<T>): T[] {
	const entries = new Map<string, { post: T; score: number; order: number }>();
	let order = 0;

	for (const post of server) {
		if (entries.has(post.id)) continue;
		const score = scorePost(post, query, keyOf(post));
		if (score === 0 && !serverIsFresh) continue;
		entries.set(post.id, { post, score, order: order++ });
	}
	for (const post of cached) {
		if (entries.has(post.id)) continue;
		const score = scorePost(post, query, keyOf(post));
		if (score > 0) entries.set(post.id, { post, score, order: order++ });
	}

	return [...entries.values()]
		.sort((a, b) => b.score - a.score || b.post.voteCount - a.post.voteCount || a.order - b.order)
		.slice(0, limit)
		.map((entry) => entry.post);
}

/** Empty-query suggestions: open posts (not done, not won't do), most voted first, de-duplicated by id. */
export function rankPopularPosts<T extends SearchPostLike>(
	lists: ReadonlyArray<ReadonlyArray<T>>,
	limit: number = SEARCH_POPULAR_LIMIT
): T[] {
	const seen = new Map<string, T>();
	for (const list of lists) {
		for (const post of list) {
			if (post.status === "done" || post.status === "canceled" || seen.has(post.id)) continue;
			seen.set(post.id, post);
		}
	}
	return [...seen.values()].sort((a, b) => b.voteCount - a.voteCount).slice(0, limit);
}

/** The structural part of a release the palette needs (satisfied by `PublicReleaseSummary`). */
export interface SearchReleaseLike {
	name: string;
	slug: string;
	status: string;
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

function releaseTime(release: SearchReleaseLike): number {
	return getReleaseDate(release)?.getTime() ?? 0;
}

function scoreRelease(release: SearchReleaseLike, query: string): number {
	const normalized = normalizeSearchQuery(query).toLowerCase();
	const terms = getSearchTerms(query);
	const slug = release.slug.toLowerCase();
	const name = release.name.toLowerCase();
	const haystack = `${slug} ${name}`;
	if (!terms.every((term) => haystack.includes(term))) return 0;
	if (slug.startsWith(normalized)) return 80;
	if (name.startsWith(normalized)) return 70;
	const words = haystack.split(WORD_SPLIT);
	if (terms.every((term) => words.some((word) => word.startsWith(term)))) return 60;
	return 40;
}

/**
 * Releases for the palette: matches on version (slug) or name, best first then newest; with no query, the latest
 * releases. Archived releases are never shown on the portal.
 */
export function filterReleases<T extends SearchReleaseLike>(
	releases: ReadonlyArray<T>,
	query: string,
	limit: number
): T[] {
	const visible = releases.filter((release) => release.status !== "archived");
	if (getSearchTerms(query).length === 0) {
		return [...visible].sort((a, b) => releaseTime(b) - releaseTime(a)).slice(0, limit);
	}
	return visible
		.map((release) => ({ release, score: scoreRelease(release, query) }))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score || releaseTime(b.release) - releaseTime(a.release))
		.slice(0, limit)
		.map((entry) => entry.release);
}

export interface SearchShortcutEvent {
	key: string;
	metaKey: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	repeat: boolean;
	isComposing: boolean;
	defaultPrevented: boolean;
	/** The event target is an input, textarea, select or contenteditable element. */
	targetIsEditable: boolean;
	/** The event target sits inside an open dialog (e.g. the login dialog). */
	targetInDialog: boolean;
}

/**
 * Cmd/Ctrl+K toggles the palette from anywhere; `/` opens it unless the user is typing or another dialog has focus.
 * Returns `null` when the key isn't a search shortcut.
 */
export function getSearchShortcut(event: SearchShortcutEvent): "toggle" | "open" | null {
	if (event.defaultPrevented || event.isComposing || event.repeat) return null;
	if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
		return "toggle";
	}
	if (
		event.key === "/" &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.altKey &&
		!event.targetIsEditable &&
		!event.targetInDialog
	) {
		return "open";
	}
	return null;
}

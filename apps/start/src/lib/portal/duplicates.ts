/** Words ignored when matching a draft title against existing posts. */
export const DUPLICATE_STOPLIST: ReadonlySet<string> = new Set([
	"when",
	"that",
	"this",
	"with",
	"from",
	"have",
	"would",
	"could",
	"for",
	"the",
	"and",
	"are",
	"can",
]);

/** Minimum title length before any matching is attempted. */
export const DUPLICATE_MIN_TITLE_LENGTH = 3;
/** Number of similar posts surfaced while composing. */
export const DUPLICATE_LIMIT = 3;
/** How many leading characters of a word must appear in a candidate title to count as a hit. */
const STEM_LENGTH = 5;

export interface DuplicateCandidate {
	id: string;
	title: string | null;
	status: string;
	voteCount: number;
}

export interface DuplicateMatch<T extends DuplicateCandidate> {
	task: T;
	score: number;
}

/** Lower-cased words longer than 2 characters, minus the stoplist (order and duplicates preserved). */
export function getDuplicateWords(title: string): string[] {
	return title
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 2 && !DUPLICATE_STOPLIST.has(word));
}

/**
 * Finds posts that look like the one being drafted. Score = number of draft words whose first 5 characters appear
 * in a candidate's title. Canceled posts are excluded; ordered by score then vote count; top 3 with a score > 0.
 * Returns `[]` until the draft title has at least 3 characters.
 */
export function findDuplicates<T extends DuplicateCandidate>(
	title: string,
	candidates: ReadonlyArray<T>,
	limit: number = DUPLICATE_LIMIT
): DuplicateMatch<T>[] {
	const trimmed = title.trim();
	if (trimmed.length < DUPLICATE_MIN_TITLE_LENGTH) return [];

	const stems = getDuplicateWords(trimmed).map((word) => word.slice(0, STEM_LENGTH));
	if (stems.length === 0) return [];

	const matches: DuplicateMatch<T>[] = [];
	for (const task of candidates) {
		if (task.status === "canceled") continue;
		const candidateTitle = (task.title ?? "").toLowerCase();
		if (!candidateTitle) continue;
		const score = stems.reduce((total, stem) => total + (candidateTitle.includes(stem) ? 1 : 0), 0);
		if (score > 0) matches.push({ task, score });
	}

	return matches.sort((a, b) => b.score - a.score || b.task.voteCount - a.task.voteCount).slice(0, limit);
}

import { getPortalStatus, getReleaseDate, isShipped, type TaskStatus } from "./status";
import type { PortalDateInput } from "./time";

/** How many posts "Shipped because you asked" lists. */
export const SHIPPED_BECAUSE_YOU_ASKED_LIMIT = 3;

/** One entry of the viewer's votes (`GET .../task/voted`): only the post id is needed here. */
export interface ActivityVote {
	taskId: string;
}

export interface ActivityRelease {
	id: string;
	name: string;
	status: string;
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

export interface ResolvedVotes<T> {
	/** The voted posts found in the loaded list, in the list's order. */
	posts: T[];
	/** Voted post ids not found in the loaded list (not loaded yet, deleted, or no longer public). */
	unresolvedIds: string[];
}

/**
 * Resolves the viewer's voted ids against the loaded post list. The result follows the list's order (not the votes'),
 * ignores duplicate vote entries, and reports the ids it could not find so the caller knows whether to load more pages.
 */
export function resolveVotedPosts<T extends { id: string }>(
	votes: ReadonlyArray<ActivityVote>,
	tasks: ReadonlyArray<T>
): ResolvedVotes<T> {
	const votedIds = new Set(votes.map((vote) => vote.taskId));
	const posts = tasks.filter((task) => votedIds.has(task.id));
	const found = new Set(posts.map((post) => post.id));
	const unresolvedIds = [...votedIds].filter((id) => !found.has(id));
	return { posts, unresolvedIds };
}

/** Posts the viewer created, from the loaded list. Everything is excluded when there is no signed-in user. */
export function filterPostedBy<T extends { createdBy?: { id: string } | null }>(
	tasks: ReadonlyArray<T>,
	userId: string | null | undefined
): T[] {
	if (!userId) return [];
	return tasks.filter((task) => task.createdBy?.id === userId);
}

export interface ShippedVote<TTask, TRelease> {
	task: TTask;
	release: TRelease;
	/** `releasedAt ?? targetDate ?? createdAt` of the release. */
	date: Date | null;
}

/**
 * "Shipped because you asked": voted posts that are done AND sit in a release that has actually been released, newest
 * release first (undated last), capped at `limit`.
 */
export function selectShippedBecauseYouAsked<
	TTask extends { status: string; releaseId?: string | null },
	TRelease extends ActivityRelease,
>(
	votedPosts: ReadonlyArray<TTask>,
	releasesById: ReadonlyMap<string, TRelease>,
	limit: number = SHIPPED_BECAUSE_YOU_ASKED_LIMIT
): Array<ShippedVote<TTask, TRelease>> {
	const shipped: Array<ShippedVote<TTask, TRelease>> = [];
	for (const task of votedPosts) {
		const release = task.releaseId ? releasesById.get(task.releaseId) : undefined;
		if (!release || !isShipped(task, release)) continue;
		shipped.push({ task, release, date: getReleaseDate(release) });
	}
	// Array#sort is stable, so posts of the same release (or both undated) keep the list's order.
	shipped.sort(
		(a, b) => (b.date?.getTime() ?? Number.NEGATIVE_INFINITY) - (a.date?.getTime() ?? Number.NEGATIVE_INFINITY)
	);
	return shipped.slice(0, Math.max(0, limit));
}

/** Legend/bar order: the four public steps, then the closed one. */
export const VOTE_STATUS_ORDER = [
	"done",
	"in-progress",
	"todo",
	"backlog",
	"canceled",
] as const satisfies ReadonlyArray<TaskStatus>;

/** How the legend swatch and the bar segment are coloured (the progress bar only knows ok / accent / muted). */
export type VoteStatusTone = "ok" | "accent" | "muted" | "hollow";

export interface VoteStatusRow {
	status: (typeof VOTE_STATUS_ORDER)[number];
	/** Public label, e.g. "In progress" (statuses are relabelled for end users). */
	label: string;
	count: number;
	tone: VoteStatusTone;
}

const VOTE_STATUS_TONE: Record<(typeof VOTE_STATUS_ORDER)[number], VoteStatusTone> = {
	done: "ok",
	"in-progress": "accent",
	todo: "muted",
	backlog: "muted",
	// "Won't do" is not progress, so it is listed in the legend but kept off the bar.
	canceled: "hollow",
};

/** Voted posts counted per public status, in legend order. Every status is present (zero counts included). */
export function buildVoteStatusRows(votedPosts: ReadonlyArray<{ status: string }>): VoteStatusRow[] {
	const counts = new Map<string, number>();
	for (const post of votedPosts) counts.set(post.status, (counts.get(post.status) ?? 0) + 1);
	return VOTE_STATUS_ORDER.map((status) => ({
		status,
		label: getPortalStatus(status).label,
		count: counts.get(status) ?? 0,
		tone: VOTE_STATUS_TONE[status],
	}));
}

export interface VoteBarSegment {
	value: number;
	tone: "ok" | "accent" | "muted";
}

/**
 * The progress bar's segments from the legend rows: done (ok), in progress (accent), and planned + open together
 * (muted). Won't do posts are left off the bar.
 */
export function buildVoteBarSegments(rows: ReadonlyArray<VoteStatusRow>): VoteBarSegment[] {
	const sum = (tone: VoteBarSegment["tone"]) =>
		rows.filter((row) => row.tone === tone).reduce((total, row) => total + row.count, 0);
	return [
		{ value: sum("ok"), tone: "ok" },
		{ value: sum("accent"), tone: "accent" },
		{ value: sum("muted"), tone: "muted" },
	];
}

/** "3" when the list is complete, "3+" when more posts may exist that have not been loaded. */
export function formatTabCount(count: number, truncated: boolean): string {
	return truncated ? `${count}+` : String(count);
}

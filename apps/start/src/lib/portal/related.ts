export const RELATED_LIMIT = 3;

export interface RelatedSource {
	id: string;
	category?: string | null;
	labels?: ReadonlyArray<{ id: string }>;
}

export interface RelatedCandidate extends RelatedSource {
	status: string;
	voteCount: number;
}

/**
 * "Related posts" for a post: ranked by shared labels, then same category, then votes. Excludes the post itself and
 * canceled posts. Candidates sharing neither a label nor the category are left out (the section hides when empty).
 */
export function findRelatedPosts<T extends RelatedCandidate>(
	source: RelatedSource,
	candidates: ReadonlyArray<T>,
	limit: number = RELATED_LIMIT
): T[] {
	const sourceLabels = new Set((source.labels ?? []).map((label) => label.id));

	const ranked: Array<{ task: T; sharedLabels: number; sameCategory: boolean }> = [];
	for (const task of candidates) {
		if (task.id === source.id || task.status === "canceled") continue;
		const sharedLabels = (task.labels ?? []).filter((label) => sourceLabels.has(label.id)).length;
		const sameCategory = !!source.category && task.category === source.category;
		if (sharedLabels === 0 && !sameCategory) continue;
		ranked.push({ task, sharedLabels, sameCategory });
	}

	return ranked
		.sort(
			(a, b) =>
				b.sharedLabels - a.sharedLabels ||
				Number(b.sameCategory) - Number(a.sameCategory) ||
				b.task.voteCount - a.task.voteCount
		)
		.slice(0, limit)
		.map((entry) => entry.task);
}

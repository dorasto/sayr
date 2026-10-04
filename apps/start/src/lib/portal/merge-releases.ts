/** Merges release lists into one, keeping the first occurrence of each id (so earlier lists win) and list order. */
export function mergeReleaseLists<T extends { id: string }>(lists: ReadonlyArray<ReadonlyArray<T>>): T[] {
	const seen = new Set<string>();
	const merged: T[] = [];
	for (const list of lists) {
		for (const release of list) {
			if (seen.has(release.id)) continue;
			seen.add(release.id);
			merged.push(release);
		}
	}
	return merged;
}

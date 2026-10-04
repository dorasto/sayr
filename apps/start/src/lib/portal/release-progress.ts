export interface ReleaseProgressLabel {
	id: string;
	name: string;
	color?: string | null;
}

export interface ReleaseProgressTask {
	status: string;
	labels?: ReadonlyArray<ReleaseProgressLabel>;
}

export interface ReleaseLabelCount extends ReleaseProgressLabel {
	count: number;
	/** count / total (0-1) — the bar width in "What it touches". */
	share: number;
}

export interface ReleaseProgress {
	/** done + inProgress + planned (canceled tasks are not counted anywhere). */
	total: number;
	done: number;
	inProgress: number;
	/** backlog + todo. */
	planned: number;
	/** Whole-number percentage of `total` that is done (0 when there are no tasks). */
	percent: number;
	/** Labels across the counted tasks, most-used first (ties broken by name). */
	labelCounts: ReleaseLabelCount[];
}

/** Done / in-progress / planned counts, percent complete and per-label counts for a release's tasks. */
export function getReleaseProgress(tasks: ReadonlyArray<ReleaseProgressTask> | null | undefined): ReleaseProgress {
	let done = 0;
	let inProgress = 0;
	let planned = 0;
	const labels = new Map<string, ReleaseLabelCount>();

	for (const task of tasks ?? []) {
		if (task.status === "canceled") continue;
		if (task.status === "done") done++;
		else if (task.status === "in-progress") inProgress++;
		else planned++;

		for (const label of task.labels ?? []) {
			const existing = labels.get(label.id);
			if (existing) existing.count++;
			else labels.set(label.id, { id: label.id, name: label.name, color: label.color, count: 1, share: 0 });
		}
	}

	const total = done + inProgress + planned;
	const labelCounts = [...labels.values()]
		.map((label) => ({ ...label, share: total === 0 ? 0 : label.count / total }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	return {
		total,
		done,
		inProgress,
		planned,
		percent: total === 0 ? 0 : Math.round((done / total) * 100),
		labelCounts,
	};
}

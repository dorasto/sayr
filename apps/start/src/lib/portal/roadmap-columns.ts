import type { BoardColumn } from "../../components/board/config/grouping-registry";
import { formatShortDate } from "./board-row";
import {
	buildReleaseColumns,
	buildStatusColumns,
	type RoadmapRelease,
	type RoadmapTask,
	UNSCHEDULED_COLUMN_KEY,
} from "./roadmap";

// The roadmap's columns in the shape the board's grouping registry produces (`BoardColumn`), so the public
// roadmap can render through the board's kanban. Pure (type-only import of the board, no JSX): the status
// chip / release link that headline each column are attached by `components/public/portal/roadmap/roadmap-groupings.tsx`,
// keyed on the column ids below.

/** Which columns the roadmap shows: the three status columns, or one column per upcoming release. */
export type RoadmapColumnsMode = "status" | "release";

/** Status-column ids (the raw task statuses the columns hold, so a header can render `StatusChip` from the id). */
export const ROADMAP_STATUS_COLUMN_IDS = ["todo", "in-progress", "done"] as const;

/** The "Unscheduled" release column's id (same key `buildReleaseColumns` uses). */
export const ROADMAP_UNSCHEDULED_COLUMN_ID = UNSCHEDULED_COLUMN_KEY;

/** Whether a release column's id belongs to the "Unscheduled" bucket rather than a release. */
export function isUnscheduledColumnId(columnId: string): boolean {
	return columnId === ROADMAP_UNSCHEDULED_COLUMN_ID;
}

/** One-line description under a release column's title: its status and target date. */
export function describeReleaseColumn(
	release: Pick<RoadmapRelease, "status" | "targetDate"> | null,
	now: Date = new Date()
): string {
	if (!release) return "Not attached to an upcoming release";
	const status = release.status === "in-progress" ? "In progress" : "Planned";
	const target = formatShortDate(release.targetDate, now);
	return target ? `${status} · target ${target}` : `${status} · no target date`;
}

/**
 * The three status columns: Planned (`todo`), In progress and Done recently (90 days from `now`, see
 * `isRecentlyShipped`). Every column is present even when empty.
 */
export function toStatusBoardColumns<T extends RoadmapTask>(
	tasks: ReadonlyArray<T>,
	releasesById: ReadonlyMap<string, RoadmapRelease>,
	now: Date
): BoardColumn<T>[] {
	const { planned, inProgress, done } = buildStatusColumns(tasks, releasesById, now);
	return [
		{
			id: "todo",
			label: "Planned",
			items: planned,
			description: "The team has agreed to build these",
			emptyMessage: "Nothing planned yet",
		},
		{
			id: "in-progress",
			label: "In progress",
			items: inProgress,
			description: "Being worked on right now",
			emptyMessage: "Nothing in progress right now",
		},
		{
			id: "done",
			label: "Done",
			items: done,
			description: "Live in the last 90 days",
			emptyMessage: "Nothing has shipped in the last 90 days",
		},
	];
}

/**
 * One column per upcoming release (earliest target first) plus "Unscheduled" when it has posts. With nothing to
 * show at all a single empty "Unscheduled" column is returned, so the board never renders without a column.
 */
export function toReleaseBoardColumns<T extends RoadmapTask, R extends RoadmapRelease>(
	tasks: ReadonlyArray<T>,
	releasesById: ReadonlyMap<string, R>,
	now: Date
): BoardColumn<T>[] {
	const columns = buildReleaseColumns(tasks, releasesById);
	if (columns.length === 0) {
		return [
			{
				id: ROADMAP_UNSCHEDULED_COLUMN_ID,
				label: "Unscheduled",
				items: [],
				description: describeReleaseColumn(null, now),
				emptyMessage: "Nothing planned or in progress yet",
			},
		];
	}
	return columns.map((column) => ({
		id: column.key,
		label: column.release?.name ?? "Unscheduled",
		items: column.tasks,
		description: describeReleaseColumn(column.release, now),
		emptyMessage: "No posts yet",
	}));
}

/** The roadmap's board columns for `mode`. `now` is injected so the 90-day "Done" rule stays testable. */
export function toBoardColumns<T extends RoadmapTask, R extends RoadmapRelease>(
	mode: RoadmapColumnsMode,
	tasks: ReadonlyArray<T>,
	releasesById: ReadonlyMap<string, R>,
	now: Date
): BoardColumn<T>[] {
	return mode === "status"
		? toStatusBoardColumns(tasks, releasesById, now)
		: toReleaseBoardColumns(tasks, releasesById, now);
}

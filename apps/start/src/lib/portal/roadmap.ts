import { type BoardTask, sortBoardTasks } from "./board-filters";
import { type PortalDateInput, toTime } from "./time";

/** "Done recently" only reaches back this many days from the release date. */
export const ROADMAP_RECENT_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The slice of a post the roadmap needs. */
export interface RoadmapTask extends BoardTask {
	releaseId?: string | null;
}

/** The slice of a release the roadmap needs (dates arrive as ISO strings from the public API). */
export interface RoadmapRelease {
	id: string;
	name: string;
	status: string;
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

export interface RoadmapStatusColumns<T> {
	planned: T[];
	inProgress: T[];
	done: T[];
}

/** A column in the "By release" view: an upcoming release, or `null` for posts without one ("Unscheduled"). */
export interface RoadmapReleaseColumn<T, R> {
	/** Stable key: the release id, or `"unscheduled"`. */
	key: string;
	release: R | null;
	tasks: T[];
}

export const UNSCHEDULED_COLUMN_KEY = "unscheduled";

/** When a release counts as having shipped: `releasedAt ?? targetDate`, as epoch ms (or `null` when it has neither). */
export function getShippedTime(release: Pick<RoadmapRelease, "releasedAt" | "targetDate">): number | null {
	return toTime(release.releasedAt) ?? toTime(release.targetDate);
}

/** Releases whose work is still ahead: `planned` or `in-progress` (shown as columns in the "By release" view). */
export function isUpcomingRelease(release: Pick<RoadmapRelease, "status">): boolean {
	return release.status === "planned" || release.status === "in-progress";
}

/**
 * Whether a post belongs under "Done recently": it is `done`, its release has status `released`, and that release's
 * `releasedAt ?? targetDate` falls within the last 90 days. Posts that were done without a release are excluded.
 */
export function isRecentlyShipped(
	task: Pick<RoadmapTask, "status" | "releaseId">,
	release: RoadmapRelease | null | undefined,
	now: Date = new Date()
): boolean {
	if (task.status !== "done" || !task.releaseId || !release || release.status !== "released") return false;
	const shipped = getShippedTime(release);
	if (shipped === null) return false;
	return shipped >= now.getTime() - ROADMAP_RECENT_DAYS * DAY_MS;
}

/**
 * Splits posts into the three roadmap columns. Planned and In progress keep the most-voted-first order; Done recently
 * lists the newest release first (votes break ties). Backlog and canceled posts are not on the roadmap.
 */
export function buildStatusColumns<T extends RoadmapTask>(
	tasks: ReadonlyArray<T>,
	releasesById: ReadonlyMap<string, RoadmapRelease>,
	now: Date = new Date()
): RoadmapStatusColumns<T> {
	const planned: T[] = [];
	const inProgress: T[] = [];
	const done: T[] = [];

	for (const task of tasks) {
		if (task.status === "todo") planned.push(task);
		else if (task.status === "in-progress") inProgress.push(task);
		else if (isRecentlyShipped(task, task.releaseId ? releasesById.get(task.releaseId) : null, now)) done.push(task);
	}

	const shippedAt = (task: T) => {
		const release = task.releaseId ? releasesById.get(task.releaseId) : null;
		return (release && getShippedTime(release)) ?? 0;
	};
	const doneSorted = sortBoardTasks(done, "mostPopular").sort((a, b) => shippedAt(b) - shippedAt(a));

	return {
		planned: sortBoardTasks(planned, "mostPopular"),
		inProgress: sortBoardTasks(inProgress, "mostPopular"),
		done: doneSorted,
	};
}

/**
 * Regroups the planned and in-progress posts into one column per upcoming release (earliest target date first, releases
 * without a date after the dated ones), then an "Unscheduled" column for posts with no upcoming release. Releases with
 * no posts get no column; "Unscheduled" is only present when it has posts.
 */
export function buildReleaseColumns<T extends RoadmapTask, R extends RoadmapRelease>(
	tasks: ReadonlyArray<T>,
	releasesById: ReadonlyMap<string, R>
): RoadmapReleaseColumn<T, R>[] {
	const byRelease = new Map<string, T[]>();
	const unscheduled: T[] = [];

	for (const task of tasks) {
		if (task.status !== "todo" && task.status !== "in-progress") continue;
		const release = task.releaseId ? releasesById.get(task.releaseId) : undefined;
		if (!release || !isUpcomingRelease(release)) {
			unscheduled.push(task);
			continue;
		}
		const bucket = byRelease.get(release.id);
		if (bucket) bucket.push(task);
		else byRelease.set(release.id, [task]);
	}

	const targetTime = (release: R) => toTime(release.targetDate);
	const releases = [...byRelease.keys()]
		.map((id) => releasesById.get(id))
		.filter((release): release is R => release !== undefined)
		.sort((a, b) => {
			const timeA = targetTime(a);
			const timeB = targetTime(b);
			if (timeA !== null && timeB !== null && timeA !== timeB) return timeA - timeB;
			if (timeA !== null && timeB === null) return -1;
			if (timeA === null && timeB !== null) return 1;
			return a.name.localeCompare(b.name, undefined, { numeric: true });
		});

	const columns: RoadmapReleaseColumn<T, R>[] = releases.map((release) => ({
		key: release.id,
		release,
		tasks: sortBoardTasks(byRelease.get(release.id) ?? [], "mostPopular"),
	}));
	if (unscheduled.length > 0) {
		columns.push({ key: UNSCHEDULED_COLUMN_KEY, release: null, tasks: sortBoardTasks(unscheduled, "mostPopular") });
	}
	return columns;
}

/**
 * Number of open posts still waiting for the team (status `backlog`), or `null` when the loaded set is incomplete so
 * the count would be a guess. `allLoaded` must be true only once every page of the list has been fetched.
 */
export function countBacklog(tasks: ReadonlyArray<Pick<BoardTask, "status">>, allLoaded: boolean): number | null {
	if (!allLoaded) return null;
	return tasks.filter((task) => task.status === "backlog").length;
}

import { getReleaseDate } from "./status";
import { type PortalDateInput, toTime } from "./time";

/** The public release status enum (`archived` is never shown on the portal). */
export type ReleaseStatus = "planned" | "in-progress" | "released" | "archived";

/** Upcoming = `planned | in-progress`: the "Coming next" releases. */
export function isUpcomingStatus(status: string): boolean {
	return status === "planned" || status === "in-progress";
}

interface ReleaseDates {
	status: string;
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

/** Upcoming releases, soonest target first; undated ones last (oldest created first). Archived releases are dropped. */
export function sortUpcomingReleases<T extends ReleaseDates>(releases: ReadonlyArray<T>): T[] {
	return releases
		.filter((release) => isUpcomingStatus(release.status))
		.sort((a, b) => {
			const aTarget = toTime(a.targetDate);
			const bTarget = toTime(b.targetDate);
			if (aTarget !== null && bTarget !== null) return aTarget - bTarget;
			if (aTarget !== null) return -1;
			if (bTarget !== null) return 1;
			return (toTime(a.createdAt) ?? 0) - (toTime(b.createdAt) ?? 0);
		});
}

/** Released releases, newest first by `releasedAt ?? targetDate ?? createdAt`. */
export function sortReleasedReleases<T extends ReleaseDates>(releases: ReadonlyArray<T>): T[] {
	return releases
		.filter((release) => release.status === "released")
		.sort((a, b) => (getReleaseDate(b)?.getTime() ?? 0) - (getReleaseDate(a)?.getTime() ?? 0));
}

/**
 * The date shown in a release's rail / header: when it shipped for a released release (falling back through target and
 * creation date), otherwise the target date, which may be missing.
 */
export function getReleaseDisplayDate(release: ReleaseDates): { prefix: "Released" | "Target"; date: Date | null } {
	if (release.status === "released") return { prefix: "Released", date: getReleaseDate(release) };
	const target = toTime(release.targetDate);
	return { prefix: "Target", date: target === null ? null : new Date(target) };
}

export interface ReleaseMonthGroup<T> {
	/** `YYYY-MM` (UTC), or "undated". */
	key: string;
	/** e.g. "April 2026"; "Undated" for releases with no date at all. */
	label: string;
	releases: T[];
}

/**
 * Splits already-ordered releases into consecutive month groups by their display date (`getReleaseDisplayDate`), for the
 * changelog feed's month headings. Order is kept: a group starts whenever the month changes.
 */
export function groupReleasesByMonth<T extends ReleaseDates>(releases: ReadonlyArray<T>): ReleaseMonthGroup<T>[] {
	const groups: ReleaseMonthGroup<T>[] = [];
	for (const release of releases) {
		const { date } = getReleaseDisplayDate(release);
		const key = date ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` : "undated";
		const last = groups.at(-1);
		if (last?.key === key) {
			last.releases.push(release);
			continue;
		}
		const label = date
			? date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
			: "Undated";
		groups.push({ key, label, releases: [release] });
	}
	return groups;
}

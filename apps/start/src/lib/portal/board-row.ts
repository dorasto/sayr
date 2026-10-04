import { type PortalDateInput, toDate, toTime } from "./time";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Relative wording stops after this many whole weeks; older posts show a short date instead. */
const RELATIVE_WEEKS_LIMIT = 4;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"} ago`;

/** "26 Apr" for the current year, "26 Apr 2025" otherwise. Empty string for a missing/invalid date. */
export function formatShortDate(value: PortalDateInput, now: Date = new Date(), withYear?: boolean): string {
	const date = toDate(value);
	if (!date) return "";
	const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
	const showYear = withYear ?? date.getFullYear() !== now.getFullYear();
	return showYear ? `${base} ${date.getFullYear()}` : base;
}

/**
 * Board row timestamp: relative wording for recent posts ("just now", "5 minutes ago", "3 days ago",
 * "1 week ago") and a short date ("26 Apr") once a post is more than a few weeks old. Future dates read as "just now".
 */
export function formatBoardTime(value: PortalDateInput, now: Date = new Date()): string {
	const time = toTime(value);
	if (time === null) return "";
	const diff = now.getTime() - time;

	if (diff < 5 * MINUTE) return "just now";
	if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "minute");
	if (diff < DAY) return plural(Math.floor(diff / HOUR), "hour");
	if (diff < 7 * DAY) return plural(Math.floor(diff / DAY), "day");
	const weeks = Math.floor(diff / (7 * DAY));
	if (weeks < RELATIVE_WEEKS_LIMIT) return plural(weeks, "week");
	return formatShortDate(value, now);
}

/** "Priya Nair" -> "Priya N."; a single word or a handle is left as it is. */
export function formatShortName(name: string | null | undefined): string {
	const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0] ?? "";
	const last = parts[parts.length - 1] ?? "";
	return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

export interface ReleaseLike {
	id: string;
	status: string;
	releasedAt?: PortalDateInput;
	targetDate?: PortalDateInput;
	createdAt?: PortalDateInput;
}

/** The most recently released release (by `releasedAt ?? targetDate ?? createdAt`), or `null` when none is out yet. */
export function pickLatestRelease<T extends ReleaseLike>(releases: ReadonlyArray<T>): T | null {
	const stamp = (release: T) =>
		toTime(release.releasedAt) ?? toTime(release.targetDate) ?? toTime(release.createdAt) ?? 0;
	let latest: T | null = null;
	for (const release of releases) {
		if (release.status !== "released") continue;
		if (latest === null || stamp(release) > stamp(latest)) latest = release;
	}
	return latest;
}

/** Splits a comma-separated URL param into a de-duplicated list, dropping empty entries. */
export function parseCsvParam(value: string | null | undefined): string[] {
	if (!value) return [];
	return [
		...new Set(
			value
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean)
		),
	];
}

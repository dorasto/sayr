/**
 * Shared date-bucketing helpers for chart X-axis data, used by
 * task-burndown-chart.tsx and task-timeline-chart.tsx.
 *
 * These are distinct from @repo/util's formatDate/formatDateCompact family:
 * formatDateKey produces a sortable/mappable ISO date key (not a display
 * string), and formatDateLabel produces a short axis-tick label rather than
 * a full date display string.
 */

/** Converts a Date into a sortable "YYYY-MM-DD" key for bucketing/map lookups. */
export function formatDateKey(date: Date): string {
	return date.toISOString().split("T")[0] || "";
}

/** Formats a "YYYY-MM-DD" date key into a short chart axis-tick label (e.g. "Sep 20"). */
export function formatDateLabel(dateKey: string): string {
	const date = new Date(dateKey);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

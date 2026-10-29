import type { ReleaseLatestUpdate } from "@repo/database";
import type { ReleaseItem } from "./release-board-model";

// The releases panel's overview sections (up next / needs attention / recently shipped): pure selection over the
// org's releases and their latest status updates, so vitest can cover it (relative / type-only imports only).

/** How long an in-progress release may go without a status update before it's flagged. */
export const STALE_UPDATE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

function isOpen(release: Pick<ReleaseItem, "status">): boolean {
	return release.status === "planned" || release.status === "in-progress";
}

function time(date: Date | string | null | undefined): number | null {
	if (!date) return null;
	const value = new Date(date).getTime();
	return Number.isNaN(value) ? null : value;
}

/** Open releases by target date (soonest first; undated ones after, in progress before planned). */
export function selectUpNext(releases: readonly ReleaseItem[], limit = 3): ReleaseItem[] {
	return releases
		.filter(isOpen)
		.slice()
		.sort((a, b) => {
			const at = time(a.targetDate);
			const bt = time(b.targetDate);
			if (at !== null && bt !== null) return at - bt;
			if (at !== null) return -1;
			if (bt !== null) return 1;
			if (a.status !== b.status) return a.status === "in-progress" ? -1 : 1;
			return a.name.localeCompare(b.name);
		})
		.slice(0, limit);
}

/** Released releases, most recently shipped first. */
export function selectRecentlyShipped(releases: readonly ReleaseItem[], limit = 3): ReleaseItem[] {
	return releases
		.filter((release) => release.status === "released")
		.slice()
		.sort((a, b) => (time(b.releasedAt) ?? 0) - (time(a.releasedAt) ?? 0))
		.slice(0, limit);
}

export type AttentionReason =
	| { kind: "health"; health: "at_risk" | "off_track" }
	/** `weeks` null = it never had a status update. */
	| { kind: "stale"; weeks: number | null };

export interface AttentionItem {
	release: ReleaseItem;
	reason: AttentionReason;
}

/**
 * Open releases worth a look: the latest status update says off track / at risk (any open release), or an in-progress
 * release has had no update for STALE_UPDATE_DAYS (or never had one). Off track first, then at risk, then stale
 * (longest-silent first).
 */
export function selectNeedsAttention(
	releases: readonly ReleaseItem[],
	latestUpdates: Readonly<Record<string, ReleaseLatestUpdate>>,
	now: Date,
	limit = 5
): AttentionItem[] {
	const items: AttentionItem[] = [];
	for (const release of releases) {
		if (!isOpen(release)) continue;
		const latest = latestUpdates[release.id];
		if (latest && latest.health !== "on_track") {
			items.push({ release, reason: { kind: "health", health: latest.health } });
			continue;
		}
		if (release.status !== "in-progress") continue;
		const postedAt = time(latest?.createdAt);
		if (postedAt === null) {
			items.push({ release, reason: { kind: "stale", weeks: null } });
		} else if (now.getTime() - postedAt >= STALE_UPDATE_DAYS * DAY_MS) {
			items.push({
				release,
				reason: { kind: "stale", weeks: Math.floor((now.getTime() - postedAt) / (7 * DAY_MS)) },
			});
		}
	}
	const rank = (item: AttentionItem) =>
		item.reason.kind === "health" ? (item.reason.health === "off_track" ? 0 : 1) : 2;
	const staleWeeks = (item: AttentionItem) =>
		item.reason.kind === "stale" ? (item.reason.weeks ?? Number.POSITIVE_INFINITY) : 0;
	return items.sort((a, b) => rank(a) - rank(b) || staleWeeks(b) - staleWeeks(a)).slice(0, limit);
}

/** The muted label beside a flagged release: "Off track", "At risk", "No update 3w", "No updates". */
export function formatAttentionReason(reason: AttentionReason): string {
	if (reason.kind === "health") return reason.health === "off_track" ? "Off track" : "At risk";
	return reason.weeks === null ? "No updates" : `No update ${reason.weeks}w`;
}

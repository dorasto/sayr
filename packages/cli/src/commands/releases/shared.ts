import { apiRequest } from "../../lib/client";
import type { CommentVisibility, ReleaseDetail, ReleaseHealth, ReleaseStatus } from "../../types";

export const RELEASE_STATUSES: ReleaseStatus[] = ["planned", "in-progress", "released", "archived"];
export const RELEASE_HEALTHS: ReleaseHealth[] = ["on_track", "at_risk", "off_track"];
export const VISIBILITIES: CommentVisibility[] = ["public", "internal"];

/**
 * `/releases/<release>` — `<release>` is a slug or an id, and the server
 * resolves either (always within the org), so the CLI never needs a lookup.
 */
export function releasePath(release: string): string {
	return `/releases/${encodeURIComponent(release)}`;
}

export function formatTaskCount(count: number): string {
	return `${count} task${count === 1 ? "" : "s"}`;
}

/** The full release (labels, PRs, tasks, counts) — also what the destructive commands read before confirming. */
export function fetchReleaseDetail(orgId: string, release: string): Promise<ReleaseDetail> {
	return apiRequest<ReleaseDetail>(releasePath(release), { query: { orgId } });
}

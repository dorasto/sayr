import { apiRequest } from "../../lib/client";
import { askSelect } from "../../lib/interactive";
import { assertDate } from "../../lib/validate";
import type { CommentVisibility, ReleaseDetail, ReleaseHealth, ReleaseStatus } from "../../types";

export const RELEASE_STATUSES: ReleaseStatus[] = ["planned", "in-progress", "released", "archived"];
export const RELEASE_HEALTHS: ReleaseHealth[] = ["on_track", "at_risk", "off_track"];
export const VISIBILITIES: CommentVisibility[] = ["public", "internal"];

/** The colours guided mode offers, as the `#RRGGBB` values the API accepts (it stores them in its hsla form). */
const RELEASE_COLORS = [
	{ name: "Blue", hex: "#3B82F6" },
	{ name: "Green", hex: "#22C55E" },
	{ name: "Red", hex: "#EF4444" },
	{ name: "Orange", hex: "#F97316" },
	{ name: "Yellow", hex: "#EAB308" },
	{ name: "Purple", hex: "#A855F7" },
	{ name: "Pink", hex: "#EC4899" },
	{ name: "Gray", hex: "#6B7280" },
];

/** Picks a badge colour from the palette; returns the `--color` value. */
export function askReleaseColor(): Promise<string> {
	return askSelect({
		message: "Colour",
		choices: RELEASE_COLORS.map(({ name, hex }) => ({ value: hex, label: name, hint: hex })),
	});
}

/** For a date prompt: why `assertDate` would refuse the answer, or undefined when it's fine. */
export function dateProblem(value: string): string | undefined {
	try {
		assertDate(value, "date");
		return undefined;
	} catch {
		return "Enter a date such as 2026-10-31.";
	}
}

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

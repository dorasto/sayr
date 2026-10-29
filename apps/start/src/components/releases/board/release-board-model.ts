import type { schema } from "@repo/database";
import type { BoardDragMutation } from "../../board/core/entity";
import type { BoardSortField, TaskSortDirection } from "../../board/filter/sort-config";
import type { FilterState } from "../../board/filter/types";

// The release entity's pure half (statuses, drop patch, filter values, sort, counts), split out of
// release-board-entity.tsx so vitest can cover it — relative / type-only imports only (no `@/`, no JSX).

export type ReleaseItem = schema.releaseType;
export type ReleaseStatus = ReleaseItem["status"];

/** The kanban's column order (and the status tiles'). */
export const RELEASE_STATUS_ORDER: readonly ReleaseStatus[] = ["planned", "in-progress", "released", "archived"];

/** The release board's "completed" status: hidden while "Show archived releases" is off. */
export const ARCHIVED_RELEASE_STATUS: ReleaseStatus = "archived";

/** Registry id of the release status grouping (also the fallback id every registry must have). */
export const RELEASE_STATUS_GROUPING_ID = "status";

export function isReleaseStatus(value: string): value is ReleaseStatus {
	return (RELEASE_STATUS_ORDER as readonly string[]).includes(value);
}

export function isReleaseArchived(release: Pick<ReleaseItem, "status">): boolean {
	return release.status === ARCHIVED_RELEASE_STATUS;
}

/** The statuses shown as columns: all four, or without Archived while archived releases are hidden. */
export function visibleReleaseStatuses(showArchived: boolean): ReleaseStatus[] {
	return RELEASE_STATUS_ORDER.filter((status) => showArchived || status !== ARCHIVED_RELEASE_STATUS);
}

/** What moving a release to another status writes. A type alias (not an interface) so it is a field patch. */
export type ReleaseStatusPatch = {
	status: ReleaseStatus;
	releasedAt?: Date | null;
};

/**
 * The patch dropping `release` onto status column `columnId` writes, or null (same status / not a status).
 * Moving into Released stamps `releasedAt` (now) unless it already has one; moving out of Released clears it.
 */
export function getReleaseStatusDropPatch(
	release: Pick<ReleaseItem, "status" | "releasedAt">,
	columnId: string,
	now: Date
): ReleaseStatusPatch | null {
	if (!isReleaseStatus(columnId) || columnId === release.status) return null;
	if (columnId === "released" && !release.releasedAt) return { status: columnId, releasedAt: now };
	if (columnId !== "released" && release.status === "released") return { status: columnId, releasedAt: null };
	return { status: columnId };
}

/** The patch a release drop writes: only the status grouping moves releases (the "none" column doesn't). */
export function resolveReleaseDrop(mutation: BoardDragMutation<ReleaseItem>, now: Date): ReleaseStatusPatch | null {
	return mutation.grouping === RELEASE_STATUS_GROUPING_ID
		? getReleaseStatusDropPatch(mutation.item, mutation.groupId, now)
		: null;
}

/** The release with a patch applied (the optimistic copy). */
export function applyReleasePatch(release: ReleaseItem, patch: ReleaseStatusPatch): ReleaseItem {
	return { ...release, ...patch };
}

/** A release's raw value(s) for a filter field (see the release entity's filter fields). */
export function extractReleaseFieldValue(release: ReleaseItem, field: string): unknown {
	switch (field) {
		case "status":
			return release.status;
		case "lead":
			return release.leadId || null;
		case "creator":
			return release.createdBy || null;
		case "target_date":
			return release.targetDate;
		case "released_at":
			return release.releasedAt;
		case "created_at":
			return release.createdAt;
		case "title":
			return release.name || "";
		default:
			return null;
	}
}

function dateValue(value: Date | string | null | undefined): number | null {
	return value ? new Date(value).getTime() : null;
}

/** Undated releases sort after dated ones in either direction (a missing target date isn't "earliest"). */
function compareOptionalDates(
	a: Date | string | null | undefined,
	b: Date | string | null | undefined,
	direction: number
): number {
	const left = dateValue(a);
	const right = dateValue(b);
	if (left === null && right === null) return 0;
	if (left === null) return 1;
	if (right === null) return -1;
	return direction * (left - right);
}

/** A sorted copy of `releases` (`releases` itself for a field releases don't have). */
export function sortReleases(
	releases: readonly ReleaseItem[],
	sortBy: BoardSortField,
	direction: TaskSortDirection
): readonly ReleaseItem[] {
	const dir = direction === "desc" ? -1 : 1;
	switch (sortBy) {
		case "targetDate":
			return [...releases].sort((a, b) => compareOptionalDates(a.targetDate, b.targetDate, dir));
		case "releasedAt":
			return [...releases].sort((a, b) => compareOptionalDates(a.releasedAt, b.releasedAt, dir));
		case "createdAt":
			return [...releases].sort((a, b) => compareOptionalDates(a.createdAt, b.createdAt, dir));
		case "name":
			return [...releases].sort((a, b) => dir * a.name.localeCompare(b.name));
		default:
			return releases;
	}
}

/** How many releases are in each status (every status present). */
export function countReleasesByStatus(releases: readonly Pick<ReleaseItem, "status">[]): Record<ReleaseStatus, number> {
	const counts: Record<ReleaseStatus, number> = { planned: 0, "in-progress": 0, released: 0, archived: 0 };
	for (const release of releases) counts[release.status] += 1;
	return counts;
}

/** The filter a status tile applies: status is `status`. */
export function buildReleaseStatusFilter(status: ReleaseStatus): FilterState {
	return {
		operator: "AND",
		groups: [
			{
				id: "release-status-tile",
				operator: "AND",
				conditions: [{ id: `release-status-${status}`, field: "status", operator: "any", value: [status] }],
			},
		],
	};
}

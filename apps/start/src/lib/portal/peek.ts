import type { schema } from "@repo/database";
import type { NodeJSON } from "prosekit/core";

/**
 * Peek (the board's row-click side panel) only opens at or above this width; narrower viewports navigate to the
 * full post instead.
 */
export const PEEK_DESKTOP_QUERY = "(min-width: 1024px)";

/** The post fields Peek renders. A board list task satisfies this directly; a fetched post is mapped onto it. */
export type PeekPost = Pick<
	schema.TaskWithLabels,
	| "id"
	| "organizationId"
	| "shortId"
	| "title"
	| "description"
	| "status"
	| "voteCount"
	| "createdAt"
	| "updatedAt"
	| "createdBy"
	| "category"
	| "releaseId"
	| "githubIssue"
	| "comments"
>;

/**
 * A short id read from the `?task=` param (or a panel trigger id) as a positive integer, or `null` when it is
 * missing, zero, negative, fractional or not a number.
 */
export function normalizeShortId(value: number | string | null | undefined): number | null {
	if (value === null || value === undefined || value === "") return null;
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** The mouse-event fields that decide whether a click is a plain left click. */
export interface RowClickLike {
	button: number;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

/**
 * Whether a row click should open Peek instead of following the link. Modified and non-primary clicks (open in a new
 * tab or window, download) are left to the browser.
 */
export function shouldInterceptRowClick(event: RowClickLike): boolean {
	return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** A post as `GET /api/public/v1/organization/{slug}/tasks/{shortId}` serialises it (dates are ISO strings). */
export interface PublicTaskResponse {
	id: string;
	organizationId: string;
	shortId: number | null;
	title: string | null;
	description: NodeJSON;
	status: schema.TaskWithLabels["status"];
	voteCount: number;
	createdAt?: string | null;
	updatedAt?: string | null;
	createdBy?: schema.UserSummary | null;
	category: string | null;
	releaseId: string | null;
}

/**
 * Maps the public single-post response onto `PeekPost`. The endpoint carries no GitHub link or comment stubs, so
 * those stay unset (the comment count comes from the comments query instead).
 */
export function mapPublicTask(data: PublicTaskResponse): PeekPost {
	return {
		id: data.id,
		organizationId: data.organizationId,
		shortId: data.shortId,
		title: data.title,
		description: data.description,
		status: data.status,
		voteCount: data.voteCount,
		createdAt: data.createdAt ? new Date(data.createdAt) : null,
		updatedAt: data.updatedAt ? new Date(data.updatedAt) : null,
		createdBy: data.createdBy ?? null,
		category: data.category,
		releaseId: data.releaseId,
	};
}

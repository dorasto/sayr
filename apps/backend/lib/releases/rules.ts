import type { ReleaseStatus, schema } from "@repo/database";

/**
 * Works out what a release's `releasedAt` should become as part of a create or
 * update, so the "shipped" date never drifts from the status:
 *
 *  - an explicit `releasedAt` from the caller always wins (a date, or `null`
 *    to clear it);
 *  - otherwise, a request that doesn't set the status leaves the date alone —
 *    an unrelated edit (a rename, a new color) must never move it;
 *  - otherwise, setting the status to `released` on a release with no date gets `now`;
 *  - otherwise, moving a release OFF `released` clears its date.
 *
 * Returns `undefined` for "leave unchanged", so callers can spread the result
 * into an update without clobbering the column.
 *
 * `currentStatus` is `null` on create (there is no previous state).
 */
export function deriveReleasedAt(params: {
	currentStatus: ReleaseStatus | null;
	currentReleasedAt: Date | null;
	/** The status the caller is setting, or `undefined` if the request doesn't change it. */
	nextStatus: ReleaseStatus | undefined;
	/** The `releasedAt` the caller passed: a date, `null` to clear, or `undefined` if omitted. */
	explicitReleasedAt: Date | null | undefined;
	now?: Date;
}): Date | null | undefined {
	const { currentStatus, currentReleasedAt, nextStatus, explicitReleasedAt, now = new Date() } = params;

	if (explicitReleasedAt !== undefined) return explicitReleasedAt;

	if (nextStatus === undefined) return undefined;

	if (nextStatus === "released") {
		return currentReleasedAt ? undefined : now;
	}

	return currentStatus === "released" ? null : undefined;
}

/**
 * Task statuses a publish leaves alone. Every other status is "open": publishing
 * closes those tasks as done, and the release detail's `taskCounts.open` counts
 * them — both read this one list so the number a caller is shown is the number
 * publishing acts on.
 */
export const FINISHED_TASK_STATUSES = ["done", "canceled"] as const;

export function isOpenTaskStatus(status: schema.taskType["status"]): boolean {
	return !(FINISHED_TASK_STATUSES as readonly string[]).includes(status);
}

export type PublishPlan =
	/** Nothing to write: the release is already released and has no open tasks. */
	| { alreadyReleased: true }
	/** Write the release (status + `releasedAt`) and close its open tasks. */
	| { alreadyReleased: false; releasedAt: Date };

/**
 * Decides what publishing a release has to do.
 *
 * A release can already be `released` without having been published — a status
 * change on its own (the web board's drag, or a `PATCH status`) neither closes
 * its tasks nor guarantees a date — so "already released" alone doesn't mean
 * there's nothing left to do:
 *
 *  - not released yet: stamp `now`, close the open tasks;
 *  - released, with open tasks: close them, and keep the release date it already
 *    has (stamping `now` only if it never got one);
 *  - released, with no open tasks: nothing to write (`alreadyReleased: true`).
 *
 * `openTaskCount` is only read for a release that is already `released`.
 */
export function planPublish(params: {
	status: ReleaseStatus;
	releasedAt: Date | null;
	openTaskCount: number;
	now?: Date;
}): PublishPlan {
	const { status, releasedAt, openTaskCount, now = new Date() } = params;

	if (status !== "released") return { alreadyReleased: false, releasedAt: now };
	if (openTaskCount === 0) return { alreadyReleased: true };
	return { alreadyReleased: false, releasedAt: releasedAt ?? now };
}

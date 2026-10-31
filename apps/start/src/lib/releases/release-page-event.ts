import type { schema } from "@repo/database";
import { isReleaseRow, readClosedTasksPayload } from "../board/apply-lander-event";
import { isTaskRecord } from "../task-created-message";

/**
 * What a server event means for the open release page (`/$orgId/releases/$slug`). Pure, so the
 * page's handlers only apply the result. Payloads are read as `unknown` and validated, never cast:
 * the same event type arrives in several shapes (see the UPDATE_RELEASES note in lib/serverEvents.ts),
 * and room broadcasts carry no `scope`, so a `scope === "CHANNEL"` gate never matches over SSE (SAY-100).
 */

export type ReleasesEventResult =
	/** Nothing about the open release changed. */
	| { kind: "none" }
	/** The release row itself changed (create / update / publish broadcast it). */
	| { kind: "release"; release: schema.releaseType }
	/** Its labels or pull requests changed, or a task moved into / out of it — reload the release with its tasks. */
	| { kind: "refetch" };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * UPDATE_RELEASES. `data` is a release row, `{ releaseId }` (labels / pull requests changed),
 * `{ taskId, releaseId }` (a task moved to `releaseId`, possibly null), or a legacy array of rows.
 */
export function readReleasesEvent(
	payload: unknown,
	releaseId: string,
	taskIds: ReadonlySet<string>
): ReleasesEventResult {
	const rows: unknown[] = Array.isArray(payload) ? payload : [payload];
	const row = rows.find((candidate) => isReleaseRow(candidate) && candidate.id === releaseId);
	if (isReleaseRow(row)) return { kind: "release", release: row };

	if (!isRecord(payload)) return { kind: "none" };
	if (typeof payload.taskId === "string") {
		// Moved in (target is this release) or out (it's in our list but now points elsewhere).
		return payload.releaseId === releaseId || taskIds.has(payload.taskId) ? { kind: "refetch" } : { kind: "none" };
	}
	return payload.releaseId === releaseId ? { kind: "refetch" } : { kind: "none" };
}

/**
 * The org's release list after an UPDATE_RELEASES `data`: a release row replaces the one with the same
 * id or is appended; any other shape ({ releaseId }, { taskId, releaseId }) leaves the list as it is.
 */
export function upsertReleaseRow(releases: schema.releaseType[], payload: unknown): schema.releaseType[] {
	if (!isReleaseRow(payload)) return releases;
	return releases.some((release) => release.id === payload.id)
		? releases.map((release) => (release.id === payload.id ? payload : release))
		: [...releases, payload];
}

/**
 * UPDATE_TASK. A full task record is upserted when it belongs to this release and removed when it
 * no longer does; `{ taskIds, status: "done" }` (publishing auto-closed tasks) updates their status.
 * Returns the same array when nothing on this page changed.
 */
export function applyReleaseTaskEvent(
	tasks: schema.TaskWithLabels[],
	payload: unknown,
	releaseId: string
): schema.TaskWithLabels[] {
	if (isTaskRecord(payload)) {
		const index = tasks.findIndex((task) => task.id === payload.id);
		if (payload.releaseId !== releaseId) {
			return index === -1 ? tasks : tasks.filter((task) => task.id !== payload.id);
		}
		if (index === -1) return [...tasks, payload];
		const next = tasks.slice();
		next[index] = payload;
		return next;
	}

	const closed = readClosedTasksPayload(payload);
	if (closed) {
		const ids = new Set(closed.taskIds);
		if (!tasks.some((task) => ids.has(task.id) && task.status !== closed.status)) return tasks;
		return tasks.map((task) => (ids.has(task.id) ? { ...task, status: closed.status } : task));
	}

	return tasks;
}

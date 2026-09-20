import type { schema } from "@repo/database";
import { sseBroadcastPublic, sseBroadcastToRoom } from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";

/**
 * Live-update (SSE) broadcasts for release changes made through `/v1/me`.
 *
 * Each helper sends what the web app's release router
 * (`routes/api/internal/v1/release.ts`) sends for the same change — same event
 * type, same payload, and the same audience (the org's `releases` room, and
 * the public room where the web router also notifies it) — so an open releases
 * page updates live no matter which surface made the change. Differences:
 *
 *  - There is no excluded client: the web router skips the browser tab that
 *    made the request (it already applied the change locally), but an API caller
 *    has no tab to skip, so every connected client is notified.
 *  - Removing a label broadcasts to the org room; the web router sends nothing
 *    for that (its page updates from the response).
 *  - A comment is announced on the public room whenever the comment's stored
 *    visibility is public. The web router decides from the request body on
 *    create (so a create that omits `visibility` — stored as public — isn't
 *    announced publicly) and from the stored row on edit and delete.
 */
type ReleaseEvent = ServerEventBaseMessage["type"];

/** Release created, updated, or published: the full row, to the org room and the public room. */
export function broadcastReleaseChanged(orgId: string, release: schema.releaseType) {
	const message = { type: "UPDATE_RELEASES" as ReleaseEvent, data: release };
	sseBroadcastToRoom(orgId, "releases", message);
	sseBroadcastPublic(orgId, { ...message });
}

/** Release deleted: the org and public rooms, plus a task refresh since the release's tasks were unlinked. */
export function broadcastReleaseDeleted(orgId: string, releaseId: string) {
	const message = { type: "DELETE_RELEASE" as ReleaseEvent, data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", message);
	sseBroadcastPublic(orgId, { ...message });

	sseBroadcastToRoom(orgId, "tasks", { type: "UPDATE_TASK" as ReleaseEvent, data: { releaseId: null } });
}

/** Tasks auto-closed by publishing a release: the org's `tasks` room only. */
export function broadcastReleaseTasksClosed(orgId: string, taskIds: string[]) {
	if (taskIds.length === 0) return;
	sseBroadcastToRoom(orgId, "tasks", { type: "UPDATE_TASK" as ReleaseEvent, data: { taskIds, status: "done" } });
}

/** Labels added to or removed from a release: the org room only (labels aren't shown publicly). */
export function broadcastReleaseLabelsChanged(orgId: string, releaseId: string) {
	sseBroadcastToRoom(orgId, "releases", { type: "UPDATE_RELEASES" as ReleaseEvent, data: { releaseId } });
}

/** A pull request linked to or unlinked from a release: the org and public rooms. */
export function broadcastReleasePullRequestsChanged(orgId: string, releaseId: string) {
	const message = { type: "UPDATE_RELEASES" as ReleaseEvent, data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", message);
	sseBroadcastPublic(orgId, { ...message });
}

/** A status update created, edited, or deleted: the org and public rooms. */
export function broadcastReleaseStatusUpdatesChanged(orgId: string, releaseId: string) {
	const message = { type: "UPDATE_RELEASE_STATUS_UPDATES" as ReleaseEvent, data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", message);
	sseBroadcastPublic(orgId, { ...message });
}

/** A comment created, edited, or deleted: the org room, and the public room only for a public comment. */
export function broadcastReleaseCommentsChanged(
	orgId: string,
	releaseId: string,
	visibility: schema.releaseCommentType["visibility"]
) {
	const message = { type: "UPDATE_RELEASE_COMMENTS" as ReleaseEvent, data: { releaseId } };
	sseBroadcastToRoom(orgId, "releases", message);
	if (visibility === "public") {
		sseBroadcastPublic(orgId, { ...message });
	}
}

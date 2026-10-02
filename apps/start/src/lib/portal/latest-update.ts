import { type PortalDateInput, toTime } from "./time";
import { isTeamMember, type OrganizationMembersLike } from "./team";

export interface UpdateCandidate {
	createdAt: PortalDateInput;
	visibility?: "public" | "internal" | string;
	parentId?: string | null;
	createdBy?: { id: string } | null;
}

/**
 * The newest top-level, public comment written by a team member — the "Latest update" card on a post.
 * Replies, internal comments, GitHub-synced comments (no `createdBy`) and non-team comments are ignored.
 */
export function getLatestUpdate<T extends UpdateCandidate>(
	comments: ReadonlyArray<T> | null | undefined,
	organization: OrganizationMembersLike
): T | null {
	let latest: T | null = null;
	let latestTime = Number.NEGATIVE_INFINITY;

	for (const comment of comments ?? []) {
		if (comment.parentId) continue;
		if (comment.visibility && comment.visibility !== "public") continue;
		if (!isTeamMember(comment.createdBy?.id, organization)) continue;
		const time = toTime(comment.createdAt) ?? Number.NEGATIVE_INFINITY;
		if (latest === null || time > latestTime) {
			latest = comment;
			latestTime = time;
		}
	}

	return latest;
}

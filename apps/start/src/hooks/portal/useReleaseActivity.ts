import { useQuery } from "@tanstack/react-query";
import {
	fetchPublicReleaseCommentTotal,
	fetchPublicReleaseStatusUpdates,
} from "@/components/public/portal/releases/types";
import { summarizeStatusUpdates } from "@/lib/portal/release-page";

const STALE_TIME = 1000 * 60;

export interface ReleaseActivity {
	/** The newest public status update's health (`on_track` etc.), or `null` with no updates. */
	health: string | null;
	updateCount: number;
	/** Public comments on the release and on its status updates. */
	commentCount: number;
}

/**
 * A release's public activity for the changelog: latest status-update health, how many updates it has, and its comment
 * total. `null` until both requests have loaded.
 */
export function useReleaseActivity(orgSlug: string, releaseSlug: string): ReleaseActivity | null {
	const updates = useQuery({
		queryKey: ["public-release-status-updates", orgSlug, releaseSlug],
		queryFn: () => fetchPublicReleaseStatusUpdates(orgSlug, releaseSlug),
		staleTime: STALE_TIME,
		select: summarizeStatusUpdates,
	});
	const comments = useQuery({
		queryKey: ["public-release-comment-total", orgSlug, releaseSlug],
		queryFn: () => fetchPublicReleaseCommentTotal(orgSlug, releaseSlug),
		staleTime: STALE_TIME,
	});

	if (!updates.data || comments.data === undefined) return null;
	return {
		health: updates.data.health,
		updateCount: updates.data.updateCount,
		commentCount: comments.data + updates.data.commentCount,
	};
}

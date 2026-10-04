import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBoardReleases } from "@/components/public/portal/board/useBoardSideData";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import {
	buildVoteBarSegments,
	buildVoteStatusRows,
	filterPostedBy,
	resolveVotedPosts,
	selectShippedBecauseYouAsked,
} from "@/lib/portal/activity";
import { BOARD_PAGE_SIZE, useBoardList } from "./useBoardList";
import { fetchPublicVotes, publicVotesKey, type PublicVoteEntry } from "./usePublicVotes";

/** Pages loaded before the activity page stops and offers "Load more": the list endpoint cannot filter by author or id. */
export const ACTIVITY_INITIAL_PAGES = 10;
/** Extra pages each "Load more" press allows. */
export const ACTIVITY_MORE_PAGES = 10;

export type ActivityTab = "voted" | "posted";

/**
 * Data for the signed-in Activity page. The viewer's votes come from `GET .../task/voted` (ids only); the posts
 * themselves are resolved against the org's post list (open + closed, most voted first, under the board's shared
 * `["org-tasks", orgId, ...]` cache), loaded page by page up to a cap because there is no by-id or by-author endpoint.
 * Paging stops early on the Voted tab once every voted post has been found; the Posted tab needs the whole list.
 */
export function useActivity(userId: string, tab: ActivityTab) {
	const { organization } = usePublicOrganizationLayout();
	const orgId = organization.id;

	const list = useBoardList({ organizationId: orgId, includeClosed: true, sortBy: "mostPopular", categoryId: null });
	const { releasesById } = useBoardReleases(organization.slug);

	const votesQuery = useQuery<PublicVoteEntry[]>({
		queryKey: publicVotesKey(orgId),
		queryFn: () => fetchPublicVotes(orgId),
		staleTime: 1000,
		gcTime: 2000 * 60,
		refetchOnWindowFocus: false,
		retry: 1,
	});
	const votes = votesQuery.data;

	const voted = useMemo(() => resolveVotedPosts(votes ?? [], list.tasks), [votes, list.tasks]);
	const posted = useMemo(() => filterPostedBy(list.tasks, userId), [list.tasks, userId]);

	// Load pages until what the active tab needs is found, the list is complete, or the cap is hit.
	const [pageCap, setPageCap] = useState(ACTIVITY_INITIAL_PAGES);
	const { hasNextPage, fetchNextPage, isFetching, isLoading, isError, isPlaceholderData } = list;
	const loadedPages = Math.ceil(list.tasks.length / BOARD_PAGE_SIZE);
	const needsMore = tab === "posted" || voted.unresolvedIds.length > 0;
	const votesReady = votes !== undefined;
	useEffect(() => {
		if (!votesReady || !needsMore) return;
		if (isLoading || isFetching || isError || isPlaceholderData || !hasNextPage) return;
		if (loadedPages >= pageCap) return;
		void fetchNextPage();
	}, [
		votesReady,
		needsMore,
		isLoading,
		isFetching,
		isError,
		isPlaceholderData,
		hasNextPage,
		loadedPages,
		pageCap,
		fetchNextPage,
	]);

	const loadMore = useCallback(() => {
		setPageCap((cap) => Math.max(cap, loadedPages) + ACTIVITY_MORE_PAGES);
	}, [loadedPages]);

	const votedTruncated = !!hasNextPage && voted.unresolvedIds.length > 0;
	const postedTruncated = !!hasNextPage;
	const activeTruncated = tab === "voted" ? votedTruncated : postedTruncated;
	const capped = !!hasNextPage && loadedPages >= pageCap;

	const shipped = useMemo(() => selectShippedBecauseYouAsked(voted.posts, releasesById), [voted.posts, releasesById]);
	const statusRows = useMemo(() => buildVoteStatusRows(voted.posts), [voted.posts]);
	const barSegments = useMemo(() => buildVoteBarSegments(statusRows), [statusRows]);

	return {
		votedPosts: voted.posts,
		postedPosts: posted,
		releasesById,
		shipped,
		statusRows,
		barSegments,
		votedTruncated,
		postedTruncated,
		/** The active tab may be missing posts that have not been loaded, and paging has paused (cap) or is still going. */
		activeTruncated,
		/** Paging has paused at the cap with posts still unloaded: offer "Load more". */
		canLoadMore: capped && needsMore,
		/** Another page is on its way. */
		isLoadingMore: list.isFetchingNextPage || (isFetching && !isLoading),
		loadMore,
		/** First load of the votes or of the post list. */
		isLoading: isLoading || isPlaceholderData || votesQuery.isPending,
		isError: (isError && list.tasks.length === 0) || votesQuery.isError,
		retry: () => {
			if (votesQuery.isError) void votesQuery.refetch();
			if (isError) void list.refetch();
		},
	};
}

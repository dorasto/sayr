import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { boardCountsKey, boardReleasesKey, useBoardReleases } from "@/components/public/portal/board/useBoardSideData";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { countBacklog } from "@/lib/portal/roadmap";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { BOARD_PAGE_SIZE, boardListKey, updateBoardTasks, useBoardList } from "./useBoardList";
import { usePublicVotes } from "./usePublicVotes";

/** Pages loaded before the roadmap stops and offers "Show more": the list endpoint has no status filter. */
export const ROADMAP_INITIAL_PAGES = 10;
/** Extra pages each "Show more" press allows. */
export const ROADMAP_MORE_PAGES = 10;

/**
 * Everything the roadmap page needs: all of the org's public posts (open + closed, most voted first; loaded page by page
 * up to a cap, since the list endpoint has no status filter), the org's recent and upcoming releases, and the realtime wiring that
 * patches both in place. Shares the board's `["org-tasks", orgId, ...]` cache, so a board "All" visit pre-warms it.
 */
export function useRoadmap() {
	const queryClient = useQueryClient();
	const { organization, serverEvents } = usePublicOrganizationLayout();
	const orgId = organization.id;
	const orgSlug = organization.slug;

	const list = useBoardList({ organizationId: orgId, includeClosed: true, sortBy: "mostPopular", categoryId: null });
	const { refetch: refetchVotes } = usePublicVotes(orgId);

	// The shared release fetch (same key as the board), so the two share one cache entry.
	const {
		releasesById,
		isPending: releasesPending,
		isError: releasesError,
		refetch: refetchReleases,
	} = useBoardReleases(orgSlug);

	// Load pages until the list is complete or the cap is hit; "Show more" raises the cap.
	const [pageCap, setPageCap] = useState(ROADMAP_INITIAL_PAGES);
	const { hasNextPage, fetchNextPage, isFetching, isLoading, isError, isPlaceholderData } = list;
	const loadedPages = Math.ceil(list.tasks.length / BOARD_PAGE_SIZE);
	useEffect(() => {
		if (isLoading || isFetching || isError || isPlaceholderData || !hasNextPage) return;
		if (loadedPages >= pageCap) return;
		void fetchNextPage();
	}, [isLoading, isFetching, isError, isPlaceholderData, hasNextPage, loadedPages, pageCap, fetchNextPage]);

	const capped = !!hasNextPage && loadedPages >= pageCap;
	const showMore = useCallback(() => {
		setPageCap((cap) => Math.max(cap, loadedPages) + ROADMAP_MORE_PAGES);
	}, [loadedPages]);

	// Realtime: patch the cached list in place (same handlers as the board) so cards move columns without a refetch.
	const handlers: WSMessageHandler<ServerEventMessage> = {
		CREATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
				queryClient.invalidateQueries({ queryKey: boardListKey(orgId) });
				queryClient.invalidateQueries({ queryKey: boardCountsKey(orgId) });
			}
		},
		UPDATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
				const updated = msg.data;
				updateBoardTasks(queryClient, orgId, (task) => (task.id === updated.id ? { ...task, ...updated } : task));
			}
		},
		UPDATE_TASK_VOTE: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === orgId) {
				const { id, voteCount } = msg.data;
				updateBoardTasks(queryClient, orgId, (task) =>
					task.id === id && task.voteCount !== voteCount ? { ...task, voteCount } : task
				);
				refetchVotes();
			}
		},
		UPDATE_RELEASES: (msg) => {
			if (msg.meta?.orgId === orgId) queryClient.invalidateQueries({ queryKey: boardReleasesKey(orgSlug) });
		},
		DELETE_RELEASE: (msg) => {
			if (msg.meta?.orgId === orgId) queryClient.invalidateQueries({ queryKey: boardReleasesKey(orgSlug) });
		},
	};
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	const allLoaded = !isLoading && !isPlaceholderData && !hasNextPage;

	return {
		tasks: list.tasks,
		releasesById,
		/** First load of the posts, or of the releases that decide which done posts count as shipped. */
		isLoading: isLoading || isPlaceholderData || (releasesPending && !releasesError),
		/** The posts never loaded, or the releases (which decide what counts as shipped) did not. */
		isError: (isError && list.tasks.length === 0) || releasesError,
		isFetchingMore: list.isFetchingNextPage || (isFetching && !isLoading),
		/** The page cap was hit before the list ran out: there may be more cards to find. */
		capped,
		showMore,
		/** Backlog posts (the ones waiting for votes), or `null` when not every page is loaded. */
		backlogCount: countBacklog(list.tasks, allLoaded),
		retry: () => {
			void list.refetch();
			if (releasesError) void refetchReleases();
		},
	};
}

import { useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { useMemo } from "react";
import type { CommentData, CommentsPage } from "@/components/public/public-comments-types";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/** Top-level comments are fetched this many per request (an oldest page and a newest page at a time). */
export const COMMENTS_PAGE_SIZE = 10;

/** React Query key shared by the conversation, the Latest update card and every realtime invalidation. */
export const publicCommentsKey = (taskId: string, organizationId: string) =>
	["public-comments", taskId, organizationId] as const;

interface UsePostCommentsArgs {
	taskId: string;
	organizationId: string;
}

/**
 * The public top-level comments of a post, loaded outside-in (oldest page and newest page per request, 10 each) and
 * flattened into one chronological list. One query serves the conversation, the Latest update card and the
 * Conversation count so they never disagree.
 */
export function usePostComments({ taskId, organizationId }: UsePostCommentsArgs) {
	const {
		value: { data: commentsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage },
	} = useStateManagementInfiniteFetch<CommentsPage>({
		key: [...publicCommentsKey(taskId, organizationId)],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/timeline/comments?org_id=${organizationId}&task_id=${taskId}&limit=${COMMENTS_PAGE_SIZE}`,
			custom: async (url, pageParam) => {
				const { fromStart = 1, fromEnd } = pageParam ?? {};

				// Fetch the "start" page first to discover totalPages
				const firstUrl = `${url}&page=${fromStart}`;
				const firstRes = await fetch(firstUrl, { credentials: "include" });
				if (!firstRes.ok) throw new Error(`Failed: ${firstRes.statusText}`);
				const firstData = await firstRes.json();

				const totalPages = Number(firstData.pagination?.totalPages ?? 1);
				const totalItems = Number(firstData.pagination?.totalItems ?? 0);
				const endPage = fromEnd ?? totalPages;

				// If start and end are the same page, skip second fetch
				let lastData = { data: [] };
				if (endPage !== fromStart) {
					const lastUrl = `${url}&page=${endPage}`;
					const lastRes = await fetch(lastUrl, { credentials: "include" });
					if (lastRes.ok) lastData = await lastRes.json();
				}

				// Merge, deduplicate by id, sort chronologically
				const merged = [...(firstData.data || []), ...(lastData.data || [])];
				const unique = Array.from(new Map(merged.map((i: CommentData) => [i.id, i])).values()).sort(
					(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
				);

				const nextStart = fromStart + 1;
				const nextEnd = endPage - 1;
				const hasMore = nextStart <= nextEnd;

				return {
					data: unique,
					pagination: {
						pageFromStart: fromStart,
						pageFromEnd: endPage,
						totalPages,
						hasMore,
						totalItems,
					},
				};
			},
			getNextPageParam: (lastPage) => {
				const p = lastPage.pagination;
				if (!p || !p.hasMore) return undefined;
				return {
					fromStart: p.pageFromStart + 1,
					fromEnd: p.pageFromEnd - 1,
				};
			},
		},
		staleTime: 1000 * 30,
	});

	// Flatten all pages with deduplication (prefer newer pages)
	const allComments = useMemo(() => {
		if (!commentsData) return [];
		const seen = new Set<string>();
		const result: CommentData[] = [];

		for (let i = commentsData.length - 1; i >= 0; i--) {
			const page = commentsData[i];
			for (const item of page?.data ?? []) {
				if (!item?.id || seen.has(item.id)) continue;
				seen.add(item.id);
				result.push(item);
			}
		}

		return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}, [commentsData]);

	// Top-level total from the server plus the replies we know about on the comments loaded so far.
	const totalCount = useMemo(() => {
		const topLevel = commentsData?.[0]?.pagination.totalItems ?? allComments.length;
		const replies = allComments.reduce((sum, comment) => sum + (comment.replyCount ?? 0), 0);
		return Math.max(topLevel, allComments.length) + replies;
	}, [commentsData, allComments]);

	return { allComments, totalCount, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage };
}

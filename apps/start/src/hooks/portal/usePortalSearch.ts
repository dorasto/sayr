import type { schema } from "@repo/database";
import { formatTaskKey } from "@repo/util";
import { type InfiniteData, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { type PublicReleaseSummary, useBoardReleases } from "@/components/public/portal/board/useBoardSideData";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
	filterReleases,
	mergePostResults,
	normalizeSearchQuery,
	rankPopularPosts,
	SEARCH_DEBOUNCE_MS,
	SEARCH_LATEST_RELEASE_LIMIT,
	SEARCH_POPULAR_LIMIT,
	SEARCH_POST_LIMIT,
	SEARCH_RELEASE_LIMIT,
	SEARCH_SERVER_MIN_LENGTH,
} from "@/lib/portal/search";
import { type BoardListPage, boardListKey } from "./useBoardList";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

const EMPTY_TASKS: schema.TaskWithLabels[] = [];

async function fetchTasks(params: Record<string, string>, signal: AbortSignal): Promise<schema.TaskWithLabels[]> {
	const query = new URLSearchParams(params);
	const res = await fetch(`${baseApiUrl}/v1/admin/organization/task/tasks?${query.toString()}`, { signal });
	if (!res.ok) throw new Error("Failed to search posts");
	const body: { data?: schema.TaskWithLabels[] } = await res.json();
	return body.data ?? EMPTY_TASKS;
}

export interface PortalSearchResults {
	posts: schema.TaskWithLabels[];
	releases: PublicReleaseSummary[];
	/** The query (trimmed) the results are for; empty means the suggestions state. */
	query: string;
	isEmptyQuery: boolean;
	/** A server request is in flight or the typed query hasn't settled yet. */
	isSearching: boolean;
	/** The server search failed (cached/client matches may still be shown). */
	isError: boolean;
}

/**
 * Data for the public search palette. Posts: matches in board lists already cached under `["org-tasks", orgId]`
 * appear instantly, then the internal list endpoint's `q` search (title + description, works for guests) is merged in
 * after a 150ms debounce, keeping the previous response on screen while the next one loads. Releases: filtered
 * client-side from the board's cached releases fetch. With no query: the most voted open posts and latest releases.
 */
export function usePortalSearch(
	orgId: string,
	orgSlug: string,
	orgShortId: string,
	rawQuery: string
): PortalSearchResults {
	const queryClient = useQueryClient();
	const query = normalizeSearchQuery(rawQuery);
	const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
	const isEmptyQuery = query.length === 0;
	const serverEnabled = debounced.length >= SEARCH_SERVER_MIN_LENGTH;

	const keyOf = useCallback(
		(post: schema.TaskWithLabels) => (post.shortId != null ? formatTaskKey(orgShortId, post.shortId) : ""),
		[orgShortId]
	);

	// Posts from whichever board lists are cached (any tab/sort/category). Re-read per keystroke; not subscribed to.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-read the cache whenever the query changes
	const cached = useMemo(() => {
		const lists = queryClient.getQueriesData<InfiniteData<BoardListPage, number>>({
			queryKey: boardListKey(orgId),
		});
		return lists.map(([, data]) =>
			Array.isArray(data?.pages) ? data.pages.flatMap((page) => page.data ?? EMPTY_TASKS) : EMPTY_TASKS
		);
	}, [queryClient, orgId, query]);

	const cachedPopular = useMemo(() => rankPopularPosts(cached, SEARCH_POPULAR_LIMIT), [cached]);

	// Different key prefix on purpose: `updateBoardTasks` rewrites every `["org-tasks", orgId, ...]` entry as infinite data.
	const popular = useQuery({
		queryKey: ["portal-search-popular", orgId],
		queryFn: ({ signal }) =>
			fetchTasks({ org_id: orgId, page: "1", limit: String(SEARCH_POPULAR_LIMIT), sortBy: "mostPopular" }, signal),
		enabled: isEmptyQuery && cachedPopular.length < SEARCH_POPULAR_LIMIT,
		staleTime: 1000 * 60,
		refetchOnWindowFocus: false,
	});

	const search = useQuery({
		queryKey: ["portal-search", orgId, debounced],
		queryFn: ({ signal }) =>
			fetchTasks(
				{ org_id: orgId, page: "1", limit: String(SEARCH_POST_LIMIT), q: debounced, include_closed: "true" },
				signal
			),
		enabled: serverEnabled,
		placeholderData: keepPreviousData,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});

	const posts = useMemo(() => {
		if (isEmptyQuery) return rankPopularPosts([cachedPopular, popular.data ?? EMPTY_TASKS], SEARCH_POPULAR_LIMIT);
		return mergePostResults({
			query,
			cached: cached.flat(),
			server: serverEnabled ? (search.data ?? EMPTY_TASKS) : EMPTY_TASKS,
			serverIsFresh: serverEnabled && !search.isPlaceholderData && debounced === query,
			keyOf,
			limit: SEARCH_POST_LIMIT,
		});
	}, [
		isEmptyQuery,
		cachedPopular,
		popular.data,
		query,
		cached,
		serverEnabled,
		search.data,
		search.isPlaceholderData,
		debounced,
		keyOf,
	]);

	const { releases: allReleases } = useBoardReleases(orgSlug);
	const releases = useMemo(
		() => filterReleases(allReleases, query, isEmptyQuery ? SEARCH_LATEST_RELEASE_LIMIT : SEARCH_RELEASE_LIMIT),
		[allReleases, query, isEmptyQuery]
	);

	const isSearching = isEmptyQuery ? popular.isFetching : debounced !== query || (serverEnabled && search.isFetching);

	return { posts, releases, query, isEmptyQuery, isSearching, isError: serverEnabled && search.isError };
}

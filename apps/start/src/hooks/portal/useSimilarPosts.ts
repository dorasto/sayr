import type { schema } from "@repo/database";
import { type InfiniteData, keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { DUPLICATE_MIN_TITLE_LENGTH } from "@/lib/portal/duplicates";
import { mergeSimilarPosts } from "@/lib/portal/new-post";
import { BOARD_PAGE_SIZE, type BoardListPage, boardListKey } from "./useBoardList";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

const EMPTY_TASKS: schema.TaskWithLabels[] = [];
/** How long the typed title settles before suggestions update. */
const SIMILAR_DEBOUNCE_MS = 150;
/** Server-side `q` hits to pull in (the endpoint caps `limit` at 30). */
const SERVER_MATCH_LIMIT = 10;

async function fetchPublicTasks(params: Record<string, string>): Promise<schema.TaskWithLabels[]> {
	const query = new URLSearchParams({ ...params, include_closed: "true", sortBy: "mostPopular" });
	const res = await fetch(`${baseApiUrl}/v1/admin/organization/task/tasks?${query.toString()}`);
	if (!res.ok) throw new Error("Failed to fetch tasks");
	const body: { data?: schema.TaskWithLabels[] } = await res.json();
	return body.data ?? EMPTY_TASKS;
}

/**
 * Posts that look like a draft title, for "upvote one instead of posting a duplicate". Combines the client-side
 * scorer over the board posts already loaded (react-query data under `["org-tasks", orgId]`, or one fetched page of the
 * most popular posts when the board was never opened) with the server's `q` search, which works for guests.
 */
export function useSimilarPosts(organizationId: string, title: string): schema.TaskWithLabels[] {
	const queryClient = useQueryClient();
	const debouncedTitle = useDebouncedValue(title.trim(), SIMILAR_DEBOUNCE_MS);
	const enabled = debouncedTitle.length >= DUPLICATE_MIN_TITLE_LENGTH;

	// Whatever board lists are cached (every tab/sort/category variant). Read once per settled title, not subscribed to.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-read the cache when the settled title changes
	const cached = useMemo(() => {
		const lists = queryClient.getQueriesData<InfiniteData<BoardListPage, number>>({
			queryKey: boardListKey(organizationId),
		});
		return lists.flatMap(([, data]) => data?.pages.flatMap((page) => page.data) ?? EMPTY_TASKS);
	}, [queryClient, organizationId, debouncedTitle]);
	const hasCachedBoard = cached.length > 0;

	// Different key prefix on purpose: `updateBoardTasks` rewrites every `["org-tasks", orgId, ...]` query as infinite data.
	const corpus = useQuery({
		queryKey: ["portal-similar-corpus", organizationId],
		queryFn: () => fetchPublicTasks({ org_id: organizationId, page: "1", limit: String(BOARD_PAGE_SIZE) }),
		enabled: enabled && !hasCachedBoard,
		staleTime: 1000 * 60,
		refetchOnWindowFocus: false,
	});

	const search = useQuery({
		queryKey: ["portal-similar-search", organizationId, debouncedTitle],
		queryFn: () =>
			fetchPublicTasks({ org_id: organizationId, page: "1", limit: String(SERVER_MATCH_LIMIT), q: debouncedTitle }),
		enabled,
		placeholderData: keepPreviousData,
		staleTime: 1000 * 30,
		refetchOnWindowFocus: false,
	});

	const loaded = hasCachedBoard ? cached : (corpus.data ?? EMPTY_TASKS);
	const serverHits = search.data ?? EMPTY_TASKS;

	return useMemo(
		() => (enabled ? mergeSimilarPosts(debouncedTitle, loaded, serverHits) : EMPTY_TASKS),
		[enabled, debouncedTitle, loaded, serverHits]
	);
}

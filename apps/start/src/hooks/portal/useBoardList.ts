import type { schema } from "@repo/database";
import { type InfiniteData, keepPreviousData, type QueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/** The internal list endpoint caps `limit` at 30 per page. */
export const BOARD_PAGE_SIZE = 30;

/** Server-side orderings the board uses. ("Recently updated" is applied client-side over the loaded set.) */
export type BoardServerSort = "mostPopular" | "newest";

export interface BoardListPage {
	data: schema.TaskWithLabels[];
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		totalItems: number;
		hasMore: boolean;
	};
}

interface UseBoardListArgs {
	organizationId: string;
	/** Active tab = open posts only; Done and All need the closed ones too (`include_closed=true`). */
	includeClosed: boolean;
	sortBy: BoardServerSort;
	/** Category id (the backend filters by it); `null` for every category. */
	categoryId: string | null;
}

/** Shared prefix for every board list query — invalidate this to refetch whichever one is mounted. */
export const boardListKey = (organizationId: string) => ["org-tasks", organizationId] as const;

const EMPTY_TASKS: schema.TaskWithLabels[] = [];

async function fetchBoardPage(
	organizationId: string,
	page: number,
	{ includeClosed, sortBy, categoryId }: Omit<UseBoardListArgs, "organizationId">
): Promise<BoardListPage> {
	const params = new URLSearchParams({
		org_id: organizationId,
		page: String(page),
		limit: String(BOARD_PAGE_SIZE),
		sortBy,
	});
	if (includeClosed) params.set("include_closed", "true");
	if (categoryId) params.set("category_id", categoryId);

	const res = await fetch(`${baseApiUrl}/v1/admin/organization/task/tasks?${params.toString()}`);
	if (!res.ok) throw new Error("Failed to fetch tasks");
	return res.json();
}

/**
 * The public board's paginated post list, under `["org-tasks", orgId, ...]` so the SSE handlers keep invalidating it
 * by prefix. Keeps the previous result on screen while a new tab/sort/category loads (no skeleton flash, no scroll reset)
 * and reports `isPlaceholderData` while it does.
 */
export function useBoardList({ organizationId, includeClosed, sortBy, categoryId }: UseBoardListArgs) {
	const query = useInfiniteQuery<BoardListPage, Error, InfiniteData<BoardListPage, number>, readonly string[], number>(
		{
			queryKey: [...boardListKey(organizationId), includeClosed ? "closed" : "open", sortBy, categoryId ?? "all"],
			queryFn: ({ pageParam }) => fetchBoardPage(organizationId, pageParam, { includeClosed, sortBy, categoryId }),
			initialPageParam: 1,
			getNextPageParam: (lastPage) => (lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined),
			placeholderData: keepPreviousData,
			staleTime: 1000 * 30,
			refetchOnWindowFocus: false,
			retry: 1,
		}
	);

	const tasks = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? EMPTY_TASKS, [query.data]);
	const totalItems = query.data?.pages[0]?.pagination.totalItems ?? 0;

	return {
		tasks,
		/** `pagination.totalItems` of the loaded query: every post matching the server-side params, not just loaded ones. */
		totalItems,
		hasNextPage: query.hasNextPage,
		fetchNextPage: query.fetchNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isFetching: query.isFetching,
		/** First load only: no data (not even a previous query's) to show yet. */
		isLoading: query.isPending && !query.isError,
		isError: query.isError,
		isPlaceholderData: query.isPlaceholderData,
		refetch: query.refetch,
	};
}

/**
 * Applies `update` to every cached board task (all tab/sort/category variants) without refetching. `update` must
 * return the same reference for tasks it leaves alone, so untouched queries keep their identity.
 */
export function updateBoardTasks(
	queryClient: QueryClient,
	organizationId: string,
	update: (task: schema.TaskWithLabels) => schema.TaskWithLabels
) {
	queryClient.setQueriesData<InfiniteData<BoardListPage, number>>(
		{ queryKey: boardListKey(organizationId) },
		(old) => {
			if (!old) return old;
			let changed = false;
			const pages = old.pages.map((page) => {
				let pageChanged = false;
				const data = page.data.map((task) => {
					const next = update(task);
					if (next !== task) pageChanged = true;
					return next;
				});
				if (!pageChanged) return page;
				changed = true;
				return { ...page, data };
			});
			return changed ? { ...old, pages } : old;
		}
	);
}

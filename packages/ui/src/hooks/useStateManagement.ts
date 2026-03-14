/** biome-ignore-all lint/suspicious/noExplicitAny: <allow any> */
import { type UseQueryResult, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
export interface UseStateManagementResult<T> {
	value: T;
	setValue: (newValue: T) => void;
}
/**
 * A React hook that uses **TanStack React Query** to manage
 * lightweight, globally accessible state with optional garbage collection.
 *
 * @example
 * ```tsx
 * const { value, setValue } = useStateManagement<number>("counter", 0);
 *
 * return (
 *   <div>
 *     <p>Count: {value}</p>
 *     <button onClick={() => setValue(value + 1)}>Increment</button>
 *   </div>
 * );
 * ```
 *
 * @template T - Type of the managed value
 *
 * @param key - A unique string key identifying this piece of state (used as React Query key)
 * @param defaultValue - Default value if none exists in cache
 * @param gcTime - Optional garbage collection time in ms (default: `Infinity`)
 *
 * @returns An object with:
 * - `value`: The current state,
 * - `setValue`: A function to update the state.
 */
export function useStateManagement<T>(
	key: string,
	defaultValue: null | T,
	gcTime?: number | undefined
): UseStateManagementResult<T> {
	const queryClient = useQueryClient();
	const queryKey = useMemo(() => [key], [key]);

	// Check cache first - if data exists, use it; otherwise return defaultValue
	// This ensures SSR-seeded data is used when available
	const cachedData = queryClient.getQueryData<T>(queryKey);
	const initialValue = cachedData !== undefined ? cachedData : defaultValue;

	const { data: value } = useQuery<T>({
		queryKey: queryKey,
		queryFn: () => {
			const storedValue = queryClient.getQueryData<T>(queryKey);
			return storedValue ?? (defaultValue as T);
		},
		// Use cached data if available, otherwise defaultValue
		// This is evaluated synchronously during render
		initialData: initialValue as T,
		staleTime: Infinity,
		gcTime: gcTime || Infinity,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: queryClient is stable, queryKey is memoized
	const setValue = useCallback(
		(newValue: T) => {
			queryClient.setQueryData<T>(queryKey, newValue);
		},
		[queryClient, queryKey]
	);

	return {
		value: value as T,
		setValue,
	};
}
export function useStateManagementKey<T>(
	key: string[],
	defaultValue: null | T,
	gcTime?: number | undefined
): UseStateManagementResult<T> {
	const queryClient = useQueryClient();
	// biome-ignore lint/correctness/useExhaustiveDependencies: key array spread is intentional for stable reference
	const queryKey = useMemo(() => key, [...key]);

	// Check cache first - if data exists, use it; otherwise return defaultValue
	const cachedData = queryClient.getQueryData<T>(queryKey);
	const initialValue = cachedData !== undefined ? cachedData : defaultValue;

	const { data: value } = useQuery<T>({
		queryKey: queryKey,
		queryFn: () => {
			const storedValue = queryClient.getQueryData<T>(queryKey);
			return storedValue ?? (defaultValue as T);
		},
		// Use cached data if available, otherwise defaultValue
		initialData: initialValue as T,
		staleTime: Infinity,
		gcTime: gcTime || Infinity,
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: queryClient is stable, queryKey is memoized
	const setValue = useCallback(
		(newValue: T) => {
			queryClient.setQueryData<T>(queryKey, newValue);
		},
		[queryClient, queryKey]
	);

	return {
		value: value as T,
		setValue,
	};
}
export interface UseStateManagementFetchType<TypeFetch, TypeMutate> {
	key: string[];
	fetch: {
		url: string;
		custom?: (url: string) => Promise<TypeFetch>;
	};
	mutate?: {
		url: string;
		custom?: (url: string, data: TypeMutate) => Promise<any>;
		options?: any;
	};
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	gcTime?: number;
	initialData?: TypeFetch;
	enabled?: boolean;
	retry?: boolean;
}

// Updated result interface to have 'value' nested and mutation properties at the top level
export interface UseStateManagementFetchResult<TypeFetch, TypeMutate = any> {
	value: {
		data: TypeFetch | undefined;
		isLoading: boolean;
		isError: boolean;
		error: Error | null;
		isRefetching: boolean;
		status: UseQueryResult<TypeFetch, Error>["status"];
		fetchStatus: UseQueryResult<TypeFetch, Error>["fetchStatus"];
		refetch: UseQueryResult<TypeFetch, Error>["refetch"];
		// You can add other useQuery result properties here as needed
	};
	// Mutation related properties at the top level
	mutate?: (newValue: TypeMutate, options?: any) => void;
	mutationPending?: boolean;
	mutationError?: Error | null;
	mutationSuccess?: boolean;
	mutationStatus?: ReturnType<typeof useMutation>["status"];
}

// Default fetcher (same as before)
const defaultFetcher = async <TData>(url: string): Promise<TData> => {
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch from ${url}: ${res.statusText}`);
	}
	const json = await res.json();
	return json;
};

// Default mutator (same as before)
const defaultMutator = async <TMutationData>(url: string, data: TMutationData): Promise<any> => {
	const headers: any = {
		"Content-Type": "application/json",
	};
	const res = await fetch(url, {
		method: "POST",
		headers: headers,
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const errorData = await res.json();
		throw new Error(errorData.message || `Failed to post data to ${url}: ${res.statusText}`);
	}
	return res.json();
};

/**
 * React Query powered state management hook
 * for fetching + optionally mutating server state
 * with minimal boilerplate.
 *
 * @example
 * ```tsx
 * type User = { id: string; name: string };
 *
 * const { value, mutate } = useStateManagementFetch<User[], Partial<User>>({
 *   key: ["users"],
 *   fetch: { url: "/api/users" },
 *   mutate: { url: "/api/users" },
 *   staleTime: 1000 * 60, // 1 min
 * });
 *
 * if (value.isLoading) return <Spinner />;
 * if (value.isError) return <p>Error: {value.error?.message}</p>;
 *
 * return (
 *   <>
 *     {value.data?.map(u => <div key={u.id}>{u.name}</div>)}
 *     <button onClick={() => mutate?.({ name: "Alice" })}>Add</button>
 *   </>
 * );
 * ```
 */
export function useStateManagementFetch<TypeFetch, TypeMutate = any>({
	key,
	initialData,
	fetch,
	mutate,
	refetchOnWindowFocus,
	staleTime,
	gcTime,
	enabled,
	retry,
}: UseStateManagementFetchType<TypeFetch, TypeMutate>): UseStateManagementFetchResult<TypeFetch, TypeMutate> {
	const queryClient = useQueryClient();

	const fetchingData = useQuery<TypeFetch, Error>({
		queryKey: key,
		queryFn: () => (fetch.custom ? fetch.custom(fetch.url) : defaultFetcher(fetch.url)),
		initialData: initialData,
		staleTime: staleTime,
		gcTime: gcTime,
		refetchOnWindowFocus: refetchOnWindowFocus,
		enabled: enabled,
		retry: retry,
	});

	// Mutation hook (only if mutate option is provided)
	const mutation = useMutation<any, Error, TypeMutate>({
		mutationFn: (newValue) => {
			const mutatorFunc = mutate?.custom ? mutate.custom : defaultMutator;
			const mutationUrl = mutate?.url || fetch.url;
			return mutatorFunc(mutationUrl, newValue);
		},
		...(mutate?.options || {}),
		onSuccess: (data, variables, context) => {
			queryClient.invalidateQueries({ queryKey: key });
			if (mutate?.options?.onSuccess) {
				mutate.options.onSuccess(data, variables, context);
			}
		},
		onError: (error, variables, context) => {
			if (mutate?.options?.onError) {
				mutate.options.onError(error, variables, context);
			} else {
				console.error(`Mutation failed for ${key}:`, error);
			}
		},
	});

	// Build the base result object with the 'value' property
	const result: UseStateManagementFetchResult<TypeFetch, TypeMutate> = {
		value: {
			data: fetchingData.data,
			isLoading: fetchingData.isLoading,
			isError: fetchingData.isError,
			error: fetchingData.error,
			isRefetching: fetchingData.isRefetching,
			status: fetchingData.status,
			fetchStatus: fetchingData.fetchStatus,
			refetch: fetchingData.refetch,
		},
	};

	// Conditionally add mutation properties directly to the top level of the result object
	if (mutate) {
		result.mutate = mutation.mutate;
		result.mutationPending = mutation.isPending;
		result.mutationError = mutation.error;
		result.mutationSuccess = mutation.isSuccess;
		result.mutationStatus = mutation.status;
	}

	return result;
}

/**
 * React Query powered infinite‑pagination state management hook.
 *
 * Mirrors `useStateManagementFetch` structure, adding full pagination support.
 *
 * Supports cursor‑ or page‑based pagination, plus optional mutation.
 *
 * @example
 * ```tsx
 * type Comment = { id: string; content: string };
 *
 * const {
 *   value,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useStateManagementInfiniteFetch<Comment[], Partial<Comment>>({
 *   key: ["comments", taskId],
 *   fetch: {
 *     url: `/api/comments?task_id=${taskId}`,
 *     // Your API can return { items: Comment[], nextCursor?: string }
 *     custom: async (url, cursor) => {
 *       const fullUrl = cursor ? `${url}&cursor=${cursor}` : url;
 *       const res = await fetch(fullUrl);
 *       if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
 *       return res.json();
 *     },
 *     getNextPageParam: (lastPage) => lastPage?.nextCursor,
 *   },
 *   mutate: { url: "/api/comments" },
 *   staleTime: 1000 * 30,
 * });
 *
 * if (value.isLoading) return <Spinner />;
 *
 * return (
 *   <>
 *     {value.data?.flatMap((page) => page.items).map((c) => (
 *       <div key={c.id}>{c.content}</div>
 *     ))}
 *     {hasNextPage && (
 *       <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
 *         {isFetchingNextPage ? "Loading..." : "Load more"}
 *       </button>
 *     )}
 *   </>
 * );
 * ```
 */
export function useStateManagementInfiniteFetch<TypePage, TypeMutate = any>({
	key,
	fetch,
	mutate,
	refetchOnWindowFocus,
	staleTime,
	gcTime,
	retry,
	enabled,
}: {
	key: (string | number)[];
	fetch: {
		url: string;
		custom?: (url: string, pageParam?: any) => Promise<TypePage>;
		getNextPageParam?: (lastPage: TypePage, allPages: TypePage[]) => any;
	};
	mutate?: {
		url?: string;
		custom?: (url: string, newValue: TypeMutate) => Promise<any>;
		options?: {
			onSuccess?: (data: any, variables: TypeMutate, context: any) => void;
			onError?: (error: any, variables: TypeMutate, context: any) => void;
		};
	};
	refetchOnWindowFocus?: boolean;
	staleTime?: number;
	gcTime?: number;
	retry?: boolean | number;
	enabled?: boolean;
}) {
	const queryClient = useQueryClient();

	// --- Infinite Query (paging/cursor-based) ---
	const fetchingData = useInfiniteQuery<TypePage, Error>({
		queryKey: key,
		queryFn: async ({ pageParam }) => {
			if (fetch.custom) {
				return fetch.custom(fetch.url, pageParam);
			}

			const urlWithParam = pageParam
				? `${fetch.url}${fetch.url.includes("?") ? "&" : "?"}cursor=${pageParam}`
				: fetch.url;

			return defaultFetcher<TypePage>(urlWithParam);
		},
		initialPageParam: undefined, // ✅ Required in React Query v5
		getNextPageParam: fetch.getNextPageParam ?? (() => undefined),
		refetchOnWindowFocus,
		staleTime,
		gcTime,
		retry,
		enabled,
	});

	// --- Mutation (if provided) ---
	const mutation = useMutation<any, Error, TypeMutate>({
		mutationFn: async (newValue) => {
			const mutatorFunc = mutate?.custom ?? defaultMutator;
			const mutationUrl = mutate?.url ?? fetch.url;
			return mutatorFunc(mutationUrl, newValue);
		},
		onSuccess: (data, variables, context) => {
			queryClient.invalidateQueries({ queryKey: key });
			mutate?.options?.onSuccess?.(data, variables, context);
		},
		onError: (error, variables, context) => {
			mutate?.options?.onError?.(error, variables, context);
			if (!mutate?.options?.onError) {
				console.error(`Mutation failed for query key ${key}:`, error);
			}
		},
	});

	// --- Unified Return (mirrors useStateManagementFetch) ---
	const result = {
		value: {
			data: fetchingData.data?.pages ?? [],
			isLoading: fetchingData.isLoading,
			isError: fetchingData.isError,
			isFetching: fetchingData.isFetching,
			isFetchingNextPage: fetchingData.isFetchingNextPage,
			error: fetchingData.error,
			status: fetchingData.status,
			fetchStatus: fetchingData.fetchStatus,
			refetch: fetchingData.refetch,
			fetchNextPage: fetchingData.fetchNextPage,
			hasNextPage: fetchingData.hasNextPage,
		},
	};

	// Conditionally include mutation fields
	if (mutate) {
		(result as any).mutate = mutation.mutate;
		(result as any).mutationPending = mutation.isPending;
		(result as any).mutationError = mutation.error;
		(result as any).mutationSuccess = mutation.isSuccess;
		(result as any).mutationStatus = mutation.status;
	}

	return result as {
		value: typeof result.value;
		mutate?: typeof mutation.mutate;
		mutationPending?: boolean;
		mutationError?: Error | null;
		mutationSuccess?: boolean;
		mutationStatus?: ReturnType<typeof useMutation>["status"];
	};
}

/** biome-ignore-all lint/suspicious/noExplicitAny: <allow any> */
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
export interface UseStateManagementResult<T> {
	value: T;
	setValue: (newValue: T) => void;
}

export function useStateManagement<T>(key: string, defaultValue: null | T): UseStateManagementResult<T> {
	const queryClient = useQueryClient();
	const queryKey = [key];

	const { data: value = defaultValue as any } = useQuery<T>({
		queryKey: queryKey,
		queryFn: () => {
			const storedValue = queryClient.getQueryData<T>(queryKey);
			return storedValue ?? (defaultValue as any);
		},
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const { mutate: setValue } = useMutation<void, Error, T>({
		mutationFn: async (newValue: T) => {
			queryClient.setQueryData<T>(queryKey, newValue);
		},
		onError: (error) => {
			console.error("Failed to set state:", error);
		},
	});

	return {
		value,
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

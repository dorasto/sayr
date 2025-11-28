"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { logger } from "@/app/lib/axiom/client";

export function QueryClientProvider({ children }: { children: ReactNode }) {
	// Create a client instance that persists across renders but is unique for each request
	const [queryClient] = useState(
		() =>
			new QueryClient({
				queryCache: new QueryCache({
					onError: (error) => {
						logger.error("Query error", { error });
					},
				}),
				mutationCache: new MutationCache({
					onError: (error) => {
						logger.error("Mutation error", { error });
					},
				}),
			})
	);

	return (
		<TanstackQueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</TanstackQueryClientProvider>
	);
}

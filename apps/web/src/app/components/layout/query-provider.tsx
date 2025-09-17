"use client";

import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

export function QueryClientProvider({ children }: { children: ReactNode }) {
	// Create a client instance that persists across renders but is unique for each request
	const [queryClient] = useState(() => new QueryClient());

	return (
		<TanstackQueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</TanstackQueryClientProvider>
	);
}

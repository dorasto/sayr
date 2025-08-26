"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useDynamicSidebar(sidebarKey: string[], defaultOpen: boolean = false) {
	const queryClient = useQueryClient();

	// Query to get the current state
	const { data: isOpen = defaultOpen } = useQuery<boolean>({
		queryKey: sidebarKey,
		queryFn: () => queryClient.getQueryData<boolean>(sidebarKey) ?? defaultOpen,
		staleTime: Infinity,
		gcTime: Infinity,
	});

	// Mutation to toggle the state
	const { mutate: toggleSidebar } = useMutation<boolean, Error>({
		mutationFn: async () => {
			const currentState = queryClient.getQueryData<boolean>(sidebarKey) ?? defaultOpen;
			const newState = !currentState;
			queryClient.setQueryData<boolean>(sidebarKey, newState);
			return newState;
		},
	});

	// Mutation to set the state explicitly
	const { mutate: setOpen } = useMutation<boolean, Error, boolean>({
		mutationFn: async (newState: boolean) => {
			queryClient.setQueryData<boolean>(sidebarKey, newState);
			return newState;
		},
	});

	return {
		isOpen,
		toggleSidebar,
		setOpen,
	};
}

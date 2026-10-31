"use client";
import type { schema } from "@repo/database";
import { useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	organization?: schema.OrganizationWithMembers;
	setTasks: (newValue: ContextType["tasks"]) => void;
	/**
	 * Race-free write: `updater` receives the LATEST list in the store (not one captured from a render).
	 * Return `prev` unchanged to skip the write. Use this for SSE handlers and the board.
	 */
	updateTasks: (updater: (prev: ContextType["tasks"]) => ContextType["tasks"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationTasks({
	children,
	tasks: initialTasks,
	organizationId,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	organizationId: string;
}) {
	const { value: tasks, setValue: setTasks } = useStateManagementKey(["tasks", organizationId], initialTasks, 30000);
	const queryClient = useQueryClient();
	// Same query-cache entry useStateManagementKey reads; setQueryData's functional form hands the updater
	// the current cached list.
	const updateTasks = useCallback<ContextType["updateTasks"]>(
		(updater) => {
			queryClient.setQueryData<ContextType["tasks"]>(["tasks", organizationId], (prev) => updater(prev ?? []));
		},
		[queryClient, organizationId]
	);
	const value = useMemo(() => ({ tasks, setTasks, updateTasks }), [tasks, setTasks, updateTasks]);

	return <RootContext.Provider value={value}>{children}</RootContext.Provider>;
}

export function useLayoutTasks() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutTasks must be used within a RootProviderOrganizationTasks");
	}
	return context;
}

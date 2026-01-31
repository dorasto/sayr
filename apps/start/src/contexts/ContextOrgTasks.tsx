"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	organization?: schema.OrganizationWithMembers;
	setTasks: (newValue: ContextType["tasks"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationTasks({
	children,
	tasks: initialTasks,
	organization,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	organization?: ContextType["organization"];
}) {
	const queryClient = useQueryClient();

	// Seed cache synchronously BEFORE useStateManagement hooks run
	// This ensures the first render uses fresh props data, not stale cache
	queryClient.setQueryData(["tasks"], initialTasks);

	// Use useStateManagement - cache is already seeded above, so it will find the data
	const { value: tasks, setValue: setTasks } = useStateManagement("tasks", initialTasks, 30000);

	return <RootContext.Provider value={{ tasks, setTasks, organization }}>{children}</RootContext.Provider>;
}

export function useLayoutTasks() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutTasks must be used within a RootProviderOrganizationTasks");
	}
	return context;
}

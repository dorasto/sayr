"use client";
import type { schema } from "@repo/database";
import { useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
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
	organizationId,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	organizationId: string;
}) {
	const { value: tasks, setValue: setTasks } = useStateManagementKey(["tasks", organizationId], initialTasks, 30000);

	return <RootContext.Provider value={{ tasks, setTasks }}>{children}</RootContext.Provider>;
}

export function useLayoutTasks() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutTasks must be used within a RootProviderOrganizationTasks");
	}
	return context;
}

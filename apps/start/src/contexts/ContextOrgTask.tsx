"use client";
import type { schema } from "@repo/database";
import { useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";

interface ContextType {
	task: schema.TaskWithLabels;
	organization?: schema.OrganizationWithMembers;
	setTask: (newValue: ContextType["task"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationTask({
	children,
	task,
	organization,
}: {
	children: ReactNode;
	task: ContextType["task"];
	organization?: ContextType["organization"];
}) {
	const { value: newTask, setValue: setTask } = useStateManagementKey(["_task_", organization?.id || ""], task, 1);
	return <RootContext.Provider value={{ task: newTask, setTask, organization }}>{children}</RootContext.Provider>;
}

export function useLayoutTask() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutTask must be used within a RootProviderOrganizationTask");
	}
	return context;
}

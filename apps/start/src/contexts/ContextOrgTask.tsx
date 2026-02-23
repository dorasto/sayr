"use client";
import type { schema } from "@repo/database";
import { useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	task: schema.TaskWithLabels;
	organization?: schema.OrganizationWithMembers;
	setTask: (newValue: ContextType["task"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationTask({
	children,
	task,
	organizationId,
}: {
	children: ReactNode;
	task: ContextType["task"];
	organizationId: string;
}) {
	const { value: newTask, setValue: setTask } = useStateManagementKey(["task", task.id, organizationId], task, 1);
	useEffect(() => {
		setTask(task)
	}, [task])
	return <RootContext.Provider value={{ task: newTask, setTask }}>{children}</RootContext.Provider>;
}

export function useLayoutTask() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutTask must be used within a RootProviderOrganizationTask");
	}
	return context;
}

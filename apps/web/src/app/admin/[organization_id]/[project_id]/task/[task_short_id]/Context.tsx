"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	task: schema.TaskWithLabels;
	setTask: (newValue: ContextType["task"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationProjectTask({
	children,
	task,
}: {
	children: ReactNode;
	task: ContextType["task"];
}) {
	const { value: newTask, setValue: setTask } = useStateManagement("_task_", task, 1);
	useEffect(() => setTask(task), [task, setTask]);
	return <RootContext.Provider value={{ task: newTask, setTask }}>{children}</RootContext.Provider>;
}

export function useLayoutProjectTask() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutProjectTask must be used within a RootProviderOrganizationProjectTask");
	}
	return context;
}

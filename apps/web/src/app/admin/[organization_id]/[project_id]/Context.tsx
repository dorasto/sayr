"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	project: schema.projectType;
	setProject: (newValue: ContextType["project"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationProject({
	children,
	project,
	tasks,
}: {
	children: ReactNode;
	project: ContextType["project"];
	tasks: ContextType["tasks"];
}) {
	const { value: NewProject, setValue: setProject } = useStateManagement("project", project);
	const { value: newTasks, setValue: setTasks } = useStateManagement("tasks", tasks);
	useEffect(() => setProject(project), [project, setProject]);
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	return (
		<RootContext.Provider value={{ project: NewProject, setProject, tasks: newTasks, setTasks }}>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutProject() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutProject must be used within a RootProviderOrganizationProject");
	}
	return context;
}

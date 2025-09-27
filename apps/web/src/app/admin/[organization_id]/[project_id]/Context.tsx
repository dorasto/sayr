"use client";
import type { schema } from "@repo/database";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2 } from "@tabler/icons-react";
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
	if (!project || !tasks) {
		return (
			<div className="flex items-center h-full mx-auto place-items-center">
				<IconLoader2 className="animate-spin" />
			</div>
		);
	}
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

"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	views: schema.savedViewType[];
	setViews: (newValue: ContextType["views"]) => void;
}

const MyTasksContext = createContext<ContextType | undefined>(undefined);

export function RootProviderMyTasks({
	children,
	tasks,
	labels,
	views,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
	views: ContextType["views"];
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement("my-tasks", tasks);
	const { value: newLabels, setValue: setLabels } = useStateManagement("my-labels", labels);
	const { value: NewViews, setValue: setViews } = useStateManagement("my-views", views);

	// Sync props → state
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setViews(views), [views, setViews]);
	return (
		<MyTasksContext.Provider
			value={{ tasks: newTasks, setTasks, labels: newLabels, setLabels, views: NewViews, setViews }}
		>
			{children}
		</MyTasksContext.Provider>
	);
}

export function useMyTasks() {
	const context = useContext(MyTasksContext);
	if (context === undefined) {
		throw new Error("useMyTasks must be used within a RootProviderMyTasks");
	}
	return context;
}

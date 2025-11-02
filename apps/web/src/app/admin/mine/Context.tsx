"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
}

const MyTasksContext = createContext<ContextType | undefined>(undefined);

export function RootProviderMyTasks({
	children,
	tasks,
	labels,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement("my-tasks", tasks);
	const { value: newLabels, setValue: setLabels } = useStateManagement("my-labels", labels);

	// Sync props → state
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);

	return (
		<MyTasksContext.Provider value={{ tasks: newTasks, setTasks, labels: newLabels, setLabels }}>
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

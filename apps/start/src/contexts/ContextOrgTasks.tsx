"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	tasks: schema.TaskWithLabels[];
	organization?: schema.OrganizationWithMembers;
	setTasks: (newValue: ContextType["tasks"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganizationTasks({
	children,
	tasks,
	organization,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	organization?: ContextType["organization"];
}) {
	const { value: newTasks, setValue: setTasks } = useStateManagement(
		"tasks",
		tasks,
		30000,
	);
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	if (!tasks) {
		return (
			<div className="flex items-center h-full mx-auto place-items-center">
				<IconLoader2 className="animate-spin" />
			</div>
		);
	}
	return (
		<RootContext.Provider value={{ tasks: newTasks, setTasks, organization }}>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutTasks() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error(
			"useLayoutProject must be used within a RootProviderOrganizationTasks",
		);
	}
	return context;
}

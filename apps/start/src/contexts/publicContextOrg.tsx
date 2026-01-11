import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import useWebSocketPublic from "@/lib/wsPublic";

interface ContextType {
	organization: schema.organizationType;
	ws: WebSocket | null;
	setOrganization: (newVaule: ContextType["organization"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function PublicOrganizationProvider({
	children,
	organization,
	tasks
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	tasks: ContextType["tasks"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: newTasks, setValue: setTasks } = useStateManagement(
		"tasks",
		tasks,
		30000,
	);
	const ws = useWebSocketPublic({ organization, setOrganization });
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	return (
		<RootContext.Provider value={{ organization: NewOrganization, ws, setOrganization, tasks: newTasks, setTasks }}>
			{children}
		</RootContext.Provider>
	);
}

export function usePublicOrganizationLayout() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("usePublicOrganizationLayout must be used within a PublicOrganizationProvider");
	}
	return context;
}

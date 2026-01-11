import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import useWebSocketPublic from "@/lib/wsPublic";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	ws: WebSocket | null;
	setOrganization: (newVaule: ContextType["organization"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function PublicOrganizationProvider({
	children,
	organization,
	tasks,
	labels,
	categories,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
	categories: ContextType["categories"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: NewTasks, setValue: setTasks } = useStateManagement("tasks", tasks);
	const { value: NewLabels, setValue: setLabels } = useStateManagement("labels", labels);
	const { value: NewCategories, setValue: setCategories } = useStateManagement("categories", categories);

	const ws = useWebSocketPublic({ organization, setOrganization });

	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setCategories(categories), [categories, setCategories]);

	return (
		<RootContext.Provider
			value={{
				organization: NewOrganization,
				ws,
				setOrganization,
				tasks: NewTasks,
				setTasks,
				labels: NewLabels,
				setLabels,
				categories: NewCategories,
				setCategories,
			}}
		>
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

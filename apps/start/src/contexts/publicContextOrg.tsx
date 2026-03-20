import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import useServerEventsPublic from "@/lib/serverEventsPublic";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	serverEvents: ReturnType<typeof useServerEventsPublic>;
	setOrganization: (newVaule: ContextType["organization"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	/** Unfiltered task list — used for sidebar counts so they don't change when a category filter is active */
	allTasks: schema.TaskWithLabels[];
	setAllTasks: (newValue: ContextType["allTasks"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	issueTemplates: schema.issueTemplateWithRelations[];
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function PublicOrganizationProvider({
	children,
	organization,
	labels,
	categories,
	issueTemplates,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	categories: ContextType["categories"];
	issueTemplates: ContextType["issueTemplates"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: NewTasks, setValue: setTasks } = useStateManagement<schema.TaskWithLabels[]>("tasks", []);
	const { value: NewAllTasks, setValue: setAllTasks } = useStateManagement<schema.TaskWithLabels[]>("allTasks", []);
	const { value: NewLabels, setValue: setLabels } = useStateManagement("labels", labels);
	const { value: NewCategories, setValue: setCategories } = useStateManagement("categories", categories);
	const serverEvents = useServerEventsPublic({
		organization,
		setOrganization
	});

	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setCategories(categories), [categories, setCategories]);

	return (
		<RootContext.Provider
			value={{
				organization: NewOrganization,
				serverEvents,
				setOrganization,
				tasks: NewTasks,
				setTasks,
				allTasks: NewAllTasks,
				setAllTasks,
				labels: NewLabels,
				setLabels,
				categories: NewCategories,
				setCategories,
				issueTemplates,
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

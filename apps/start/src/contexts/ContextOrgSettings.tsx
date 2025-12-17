"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	setOrganization: (newValue: ContextType["organization"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	views: schema.savedViewType[];
	setViews: (newValue: ContextType["views"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: ContextType["tasks"]) => void;
	isProjectPanelOpen: boolean;
	setProjectPanelOpen: (newValue: boolean) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function SettingsProviderOrganization({
	children,
	organization,
	labels,
	views,
	categories,
	tasks,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	tasks: ContextType["tasks"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement(
		"organization",
		organization,
		30000
	);
	const { value: Newlabels, setValue: setLabels } = useStateManagement("labels", labels, 30000);
	const { value: NewViews, setValue: setViews } = useStateManagement("views", views, 30000);
	const { value: NewCategories, setValue: setCategories } = useStateManagement("categories", categories, 30000);
	const { value: NewTasks, setValue: setTasks } = useStateManagement("tasks", tasks, 30000);
	const { value: isProjectPanelOpen, setValue: setProjectPanelOpen } = useStateManagement(
		"isProjectPanelOpen",
		true,
		30000
	);
	// Sync props → state
	useEffect(() => setOrganization(organization), [organization, setOrganization]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setViews(views), [views, setViews]);
	useEffect(() => setCategories(categories), [categories, setCategories]);
	useEffect(() => setTasks(tasks), [tasks, setTasks]);
	return (
		<RootContext.Provider
			value={{
				organization: NewOrganization,
				setOrganization,
				labels: Newlabels,
				setLabels,
				views: NewViews,
				setViews,
				categories: NewCategories,
				setCategories,
				tasks: NewTasks,
				setTasks,
				isProjectPanelOpen,
				setProjectPanelOpen,
			}}
		>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutOrganizationSettings() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutOrganizationSettings must be used within a SettingsProviderOrganization");
	}
	return context;
}

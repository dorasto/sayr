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
	issueTemplates: schema.issueTemplateWithRelations[];
	setIssueTemplates: (newValue: ContextType["issueTemplates"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: ContextType["releases"]) => void;
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
	issueTemplates,
	releases,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	tasks: ContextType["tasks"];
	issueTemplates: ContextType["issueTemplates"];
	releases: ContextType["releases"];
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
	const { value: NewIssueTemplates, setValue: setIssueTemplates } = useStateManagement(
		"issueTemplates",
		issueTemplates,
		30000
	);
	const { value: NewReleases, setValue: setReleases } = useStateManagement("releases", releases, 30000);
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
	useEffect(() => setIssueTemplates(issueTemplates), [issueTemplates, setIssueTemplates]);
	useEffect(() => setReleases(releases), [releases, setReleases]);
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
				issueTemplates: NewIssueTemplates,
				setIssueTemplates,
				releases: NewReleases,
				setReleases,
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

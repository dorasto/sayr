"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

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
	organization: initialOrganization,
	labels: initialLabels,
	views: initialViews,
	categories: initialCategories,
	tasks: initialTasks,
	issueTemplates: initialIssueTemplates,
	releases: initialReleases,
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
	const queryClient = useQueryClient();

	// Seed cache synchronously BEFORE useStateManagement hooks run
	// This ensures the first render uses fresh props data, not stale cache
	queryClient.setQueryData(["organization"], initialOrganization);
	queryClient.setQueryData(["labels"], initialLabels);
	queryClient.setQueryData(["views"], initialViews);
	queryClient.setQueryData(["categories"], initialCategories);
	queryClient.setQueryData(["tasks"], initialTasks);
	queryClient.setQueryData(["issueTemplates"], initialIssueTemplates);
	queryClient.setQueryData(["releases"], initialReleases);

	// Use useStateManagement - cache is already seeded above, so it will find the data
	const { value: organization, setValue: setOrganization } = useStateManagement("organization", initialOrganization, 30000);
	const { value: labels, setValue: setLabels } = useStateManagement("labels", initialLabels, 30000);
	const { value: views, setValue: setViews } = useStateManagement("views", initialViews, 30000);
	const { value: categories, setValue: setCategories } = useStateManagement("categories", initialCategories, 30000);
	const { value: tasks, setValue: setTasks } = useStateManagement("tasks", initialTasks, 30000);
	const { value: issueTemplates, setValue: setIssueTemplates } = useStateManagement("issueTemplates", initialIssueTemplates, 30000);
	const { value: releases, setValue: setReleases } = useStateManagement("releases", initialReleases, 30000);
	const { value: isProjectPanelOpen, setValue: setProjectPanelOpen } = useStateManagement("isProjectPanelOpen", true, 30000);

	return (
		<RootContext.Provider
			value={{
				organization,
				setOrganization,
				labels,
				setLabels,
				views,
				setViews,
				categories,
				setCategories,
				tasks,
				setTasks,
				issueTemplates,
				setIssueTemplates,
				releases,
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

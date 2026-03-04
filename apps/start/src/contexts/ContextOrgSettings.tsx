"use client";
import type { schema } from "@repo/database";
import { useStateManagement, useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
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
	permissions: schema.TeamPermissions;
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
	permissions: initialPermissions,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	tasks: ContextType["tasks"];
	issueTemplates: ContextType["issueTemplates"];
	releases: ContextType["releases"];
	permissions: ContextType["permissions"];
}) {
	const { value: organization, setValue: setOrganization } = useStateManagementKey(["organization", initialOrganization.id], initialOrganization, 30000);
	const { value: labels, setValue: setLabels } = useStateManagementKey(["labels", initialOrganization.id], initialLabels, 30000);
	const { value: views, setValue: setViews } = useStateManagementKey(["views", initialOrganization.id], initialViews, 30000);
	const { value: categories, setValue: setCategories } = useStateManagementKey(["categories", initialOrganization.id], initialCategories, 30000);
	const { value: tasks, setValue: setTasks } = useStateManagementKey(["tasks", initialOrganization.id], initialTasks, 30000);
	const { value: issueTemplates, setValue: setIssueTemplates } = useStateManagementKey(["issueTemplates", initialOrganization.id], initialIssueTemplates, 30000);
	const { value: releases, setValue: setReleases } = useStateManagementKey(["releases", initialOrganization.id], initialReleases, 30000);
	const { value: permissions } = useStateManagementKey(["permissions", initialOrganization.id], initialPermissions, 30000);
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
				permissions,
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

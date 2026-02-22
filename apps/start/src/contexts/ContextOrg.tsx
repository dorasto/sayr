"use client";
import type { schema } from "@repo/database";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { useHydration } from "./HydrationContext";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	setOrganization: (newValue: ContextType["organization"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
	views: schema.savedViewType[];
	setViews: (newValue: ContextType["views"]) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: ContextType["categories"]) => void;
	issueTemplates: schema.issueTemplateWithRelations[];
	setIssueTemplates: (newValue: ContextType["issueTemplates"]) => void;
	releases: schema.releaseType[];
	setReleases: (newValue: ContextType["releases"]) => void;
	isProjectPanelOpen: boolean;
	setProjectPanelOpen: (newValue: boolean) => void;
	isMobile: boolean;
	isMobileHydrated: boolean;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganization({
	children,
	organization: initialOrganization,
	labels: initialLabels,
	views: initialViews,
	categories: initialCategories,
	issueTemplates: initialIssueTemplates,
	releases: initialReleases,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	issueTemplates: ContextType["issueTemplates"];
	releases: ContextType["releases"];
}) {
	const isMobile = useIsMobile();
	const { isHydrated } = useHydration();

	// Use useStateManagement - cache is already seeded above, so it will find the data
	const { value: organization, setValue: setOrganization } = useStateManagement("organization", initialOrganization, 30000);
	const { value: labels, setValue: setLabels } = useStateManagement("labels", initialLabels, 30000);
	const { value: views, setValue: setViews } = useStateManagement("views", initialViews, 30000);
	const { value: categories, setValue: setCategories } = useStateManagement("categories", initialCategories, 30000);
	const { value: issueTemplates, setValue: setIssueTemplates } = useStateManagement("issueTemplates", initialIssueTemplates, 30000);
	const { value: releases, setValue: setReleases } = useStateManagement("releases", initialReleases, 30000);
	const { value: isProjectPanelOpen, setValue: setProjectPanelOpen } = useStateManagement("isProjectPanelOpen", true, 30000);

	// After hydration, sync panel state with mobile detection (only once)
	useEffect(() => {
		if (isHydrated && isMobile) {
			setProjectPanelOpen(false);
		}
	}, [isHydrated, isMobile, setProjectPanelOpen]);

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
				issueTemplates,
				setIssueTemplates,
				releases,
				setReleases,
				isProjectPanelOpen,
				setProjectPanelOpen,
				isMobile,
				isMobileHydrated: isHydrated,
			}}
		>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutOrganization() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutOrganization must be used within a RootProviderOrganization");
	}
	return context;
}

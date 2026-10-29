"use client";
import type { schema } from "@repo/database";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { useStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext } from "react";
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
	/**
	 * Race-free write: `updater` receives the LATEST list in the store (not one captured from a render).
	 * Return `prev` unchanged to skip the write. Use this for SSE handlers and the releases board.
	 */
	updateReleases: (updater: (prev: ContextType["releases"]) => ContextType["releases"]) => void;
	isMobile: boolean;
	isMobileHydrated: boolean;
	permissions: schema.TeamPermissions;
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
	permissions: initialPermissions,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
	categories: ContextType["categories"];
	issueTemplates: ContextType["issueTemplates"];
	releases: ContextType["releases"];
	permissions: ContextType["permissions"];
}) {
	const isMobile = useIsMobile();
	const { isHydrated } = useHydration();

	// Use useStateManagement - cache is already seeded above, so it will find the data
	const { value: organization, setValue: setOrganization } = useStateManagementKey(
		["organization", initialOrganization.id],
		initialOrganization,
		30000
	);
	const { value: labels, setValue: setLabels } = useStateManagementKey(
		["labels", initialOrganization.id],
		initialLabels,
		30000
	);
	const { value: views, setValue: setViews } = useStateManagementKey(
		["views", initialOrganization.id],
		initialViews,
		30000
	);
	const { value: categories, setValue: setCategories } = useStateManagementKey(
		["categories", initialOrganization.id],
		initialCategories,
		30000
	);
	const { value: issueTemplates, setValue: setIssueTemplates } = useStateManagementKey(
		["issueTemplates", initialOrganization.id],
		initialIssueTemplates,
		30000
	);
	const { value: releases, setValue: setReleases } = useStateManagementKey(
		["releases", initialOrganization.id],
		initialReleases,
		30000
	);
	const queryClient = useQueryClient();
	// Same query-cache entry useStateManagementKey reads above; setQueryData's functional form hands the
	// updater the current cached list (the ContextOrgTasks `updateTasks` pattern).
	const updateReleases = useCallback<ContextType["updateReleases"]>(
		(updater) => {
			queryClient.setQueryData<ContextType["releases"]>(["releases", initialOrganization.id], (prev) =>
				updater(prev ?? [])
			);
		},
		[queryClient, initialOrganization.id]
	);
	const { value: permissions } = useStateManagementKey(
		["permissions", initialOrganization.id],
		initialPermissions,
		30000
	);

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
				updateReleases,
				isMobile,
				isMobileHydrated: isHydrated,
				permissions: permissions!,
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

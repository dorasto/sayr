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
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganization({
	children,
	organization,
	labels,
	views,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
	views: ContextType["views"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: Newlabels, setValue: setLabels } = useStateManagement("labels", labels);
	const { value: NewViews, setValue: setViews } = useStateManagement("views", views);
	// Sync props → state
	useEffect(() => setOrganization(organization), [organization, setOrganization]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	useEffect(() => setViews(views), [views, setViews]);
	return (
		<RootContext.Provider
			value={{
				organization: NewOrganization,
				setOrganization,
				labels: Newlabels,
				setLabels,
				views: NewViews,
				setViews,
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

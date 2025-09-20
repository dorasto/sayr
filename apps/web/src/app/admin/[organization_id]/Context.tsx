"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext, useEffect } from "react";

interface ContextType {
	organization: schema.OrganizationWithMembers;
	setOrganization: (newValue: ContextType["organization"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: ContextType["labels"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganization({
	children,
	organization,
	labels,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
	labels: ContextType["labels"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const { value: Newlabels, setValue: setLabels } = useStateManagement("labels", labels);
	// Sync props → state
	useEffect(() => setOrganization(organization), [organization, setOrganization]);
	useEffect(() => setLabels(labels), [labels, setLabels]);
	return (
		<RootContext.Provider value={{ organization: NewOrganization, setOrganization, labels: Newlabels, setLabels }}>
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

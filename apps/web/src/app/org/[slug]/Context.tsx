"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";
import useWebSocketPublic from "@/app/lib/wsPublic";

interface ContextType {
	organization: schema.organizationType;
	ws: WebSocket | null;
	setOrganization: (newVaule: ContextType["organization"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProviderOrganization({
	children,
	organization,
}: {
	children: ReactNode;
	organization: ContextType["organization"];
}) {
	const { value: NewOrganization, setValue: setOrganization } = useStateManagement("organization", organization);
	const ws = useWebSocketPublic({ organization, setOrganization });
	return (
		<RootContext.Provider value={{ organization: NewOrganization, ws, setOrganization }}>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutDataOrganization() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutData must be used within a RootProvider");
	}
	return context;
}

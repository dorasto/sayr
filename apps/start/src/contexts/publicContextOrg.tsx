import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";
import useWebSocketPublic from "@/lib/wsPublic";

interface ContextType {
	organization: schema.organizationType;
	ws: WebSocket | null;
	setOrganization: (newVaule: ContextType["organization"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function PublicOrganizationProvider({
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

export function usePublicOrganizationLayout() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("usePublicOrganizationLayout must be used within a PublicOrganizationProvider");
	}
	return context;
}

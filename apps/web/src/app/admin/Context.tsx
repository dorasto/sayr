"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";
import useWebSocket from "../lib/ws";

interface ContextType {
	account: schema.userType;
	setAccount: (newValue: ContextType["account"]) => void;
	ws: WebSocket | null;
	organizations: schema.OrganizationWithMembers[];
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProvider({
	children,
	account,
	organizations,
}: {
	children: ReactNode;
	account: ContextType["account"];
	organizations: ContextType["organizations"];
}) {
	const { value: Newaccount, setValue: setAccount } = useStateManagement("account", account);
	const { value: NewOrganizations } = useStateManagement("organizations", organizations);
	const ws = useWebSocket();
	return (
		<RootContext.Provider value={{ account: Newaccount, setAccount, ws, organizations: NewOrganizations }}>
			{children}
		</RootContext.Provider>
	);
}

export function useLayoutData() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutData must be used within a RootProvider");
	}
	return context;
}

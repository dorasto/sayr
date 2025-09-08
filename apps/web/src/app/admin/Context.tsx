"use client";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";
import useWebSocket from "../lib/ws";

interface ContextType {
	account: {
		id: string;
		email: string;
		emailVerified: boolean;
		name: string;
		createdAt: Date;
		updatedAt: Date;
		image?: string | null | undefined;
		role: string;
		banned: boolean | null | undefined;
		banReason?: string | null | undefined;
		banExpires?: Date | null | undefined;
	};
	setAccount: (newValue: ContextType["account"]) => void;
	ws: WebSocket | null;
	// biome-ignore lint/suspicious/noExplicitAny: <need types>
	organizations: any[];
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

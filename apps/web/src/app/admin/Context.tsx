"use client";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import type { InvitationStatus } from "better-auth/plugins";
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
	setValue: (newValue: ContextType["account"]) => void;
	ws: WebSocket | null;
	organization: {
		members: {
			id: string;
			organizationId: string;
			role: "member" | "admin" | "owner";
			createdAt: Date;
			userId: string;
			user: {
				email: string;
				name: string;
				image?: string | undefined;
			};
		}[];
		invitations: {
			id: string;
			organizationId: string;
			email: string;
			role: "member" | "admin" | "owner";
			status: InvitationStatus;
			inviterId: string;
			expiresAt: Date;
		}[];
	} & {
		id: string;
		name: string;
		slug: string;
		createdAt: Date;
		logo?: string | null | undefined | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: <any>
		metadata?: any;
	};
	setOrg: (newValue: ContextType["organization"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProvider({
	children,
	account,
	organization,
}: {
	children: ReactNode;
	account: ContextType["account"];
	organization: ContextType["organization"] | null;
}) {
	const { value: Newaccount, setValue } = useStateManagement("account", account);
	const { value: newOrg, setValue: setOrg } = useStateManagement("organization", organization);
	const ws = useWebSocket();
	return (
		<RootContext.Provider value={{ account: Newaccount, setValue, ws, organization: newOrg, setOrg }}>
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

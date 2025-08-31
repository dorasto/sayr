"use client";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useContext } from "react";

interface ContextType {
	account: {
		session: {
			id: string;
			userId: string;
			expiresAt: Date;
			createdAt: Date;
			updatedAt: Date;
			token: string;
			ipAddress?: string | null | undefined;
			userAgent?: string | null | undefined;
			impersonatedBy?: string | null | undefined;
		};
		user: {
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
	};
	setValue: (newValue: ContextType["account"]) => void;
}

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProvider({ children, account }: { children: ReactNode; account: ContextType["account"] }) {
	const { value: Newaccount, setValue } = useStateManagement("account", account);
	return <RootContext.Provider value={{ account: Newaccount, setValue }}>{children}</RootContext.Provider>;
}

export function useLayoutData() {
	const context = useContext(RootContext);
	if (context === undefined) {
		throw new Error("useLayoutData must be used within a RootProvider");
	}
	return context;
}

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useCallback, useContext, useEffect } from "react";
import { notificationActions } from "@/lib/stores/notification-store";
import useWebSocket from "@/lib/ws";

interface ContextType {
	account: schema.userType;
	setAccount: (newValue: ContextType["account"]) => void;
	ws: WebSocket | null;
	organizations: schema.OrganizationWithMembers[];
	setOrganizations: (newVaule: ContextType["organizations"]) => void;
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
	const { value: NewOrganizations, setValue: setOrganizations } = useStateManagement("organizations", organizations);
	const ws = useWebSocket();
	// Sync props → state
	useEffect(() => setAccount(account), [account, setAccount]);
	useEffect(() => setOrganizations(organizations), [organizations, setOrganizations]);

	// Fetch initial unread notification count
	useEffect(() => {
		notificationActions.refresh();
	}, []);

	// Global WS listener for notification count updates
	const handleNotificationWS = useCallback((event: MessageEvent) => {
		try {
			const data = JSON.parse(event.data);
			if (data.type === "NEW_NOTIFICATION") {
				notificationActions.increment();
			} else if (data.type === "NOTIFICATION_READ") {
				if (data.data?.all) {
					notificationActions.markAllRead();
				} else if (data.data?.taskId && data.data?.count) {
					// Notifications marked read by viewing a task directly
					for (let i = 0; i < data.data.count; i++) {
						notificationActions.decrement();
					}
				} else if (data.data?.id) {
					notificationActions.decrement();
				}
			}
		} catch {
			// Non-critical
		}
	}, []);

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleNotificationWS);
		return () => {
			ws.removeEventListener("message", handleNotificationWS);
		};
	}, [ws, handleNotificationWS]);

	return (
		<RootContext.Provider
			value={{ account: Newaccount, setAccount, ws, organizations: NewOrganizations, setOrganizations }}
		>
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

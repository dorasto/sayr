import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { createContext, type ReactNode, useCallback, useContext, useEffect } from "react";
import { notificationActions } from "@/lib/stores/notification-store";
import useServerEvents from "@/lib/serverEvents";

interface ContextType {
	account: schema.userType;
	setAccount: (newValue: ContextType["account"]) => void;
	organizations: schema.OrganizationWithMembers[];
	setOrganizations: (newVaule: ContextType["organizations"]) => void;
	serverEvents: ReturnType<typeof useServerEvents>;
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
	const serverEvents = useServerEvents();
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
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleNotificationWS);
		return () => {
			serverEvents.event?.removeEventListener("message", handleNotificationWS);
		};
	}, [serverEvents.event, handleNotificationWS]);

	return (
		<RootContext.Provider
			value={{ account: Newaccount, setAccount, organizations: NewOrganizations, setOrganizations, serverEvents }}
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

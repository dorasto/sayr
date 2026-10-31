import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext, useEffect } from "react";
import { favouritesActions } from "@/lib/stores/favourites-store";
import { notificationActions } from "@/lib/stores/notification-store";
import { personalViewsActions } from "@/lib/stores/personal-views-store";
import useServerEvents from "@/lib/serverEvents";

interface ContextType {
	account: schema.userType;
	setAccount: (newValue: ContextType["account"]) => void;
	organizations: schema.OrganizationWithMembers[];
	setOrganizations: (newVaule: ContextType["organizations"]) => void;
	/** Each org's shared saved views by org id, for the sidebar's org sections (SAY-104). */
	orgViews: Record<string, schema.savedViewType[]>;
	/** Replaces one org's views (after a write, or an UPDATE_VIEWS event). */
	setOrgViews: (orgId: string, views: schema.savedViewType[]) => void;
	serverEvents: ReturnType<typeof useServerEvents>;
	/** Whether AI features are available on this instance (key configured + edition allows it). */
	aiEnabled: boolean;
}

const ORG_VIEWS_KEY = "org-views";

const RootContext = createContext<ContextType | undefined>(undefined);

export function RootProvider({
	children,
	account,
	organizations,
	orgViews,
	aiEnabled,
}: {
	children: ReactNode;
	account: ContextType["account"];
	organizations: ContextType["organizations"];
	orgViews: ContextType["orgViews"];
	aiEnabled: boolean;
}) {
	const { value: Newaccount, setValue: setAccount } = useStateManagement("account", account);
	const { value: NewOrganizations, setValue: setOrganizations } = useStateManagement("organizations", organizations);
	const serverEvents = useServerEvents();
	// Sync props → state
	useEffect(() => setAccount(account), [account, setAccount]);
	useEffect(() => setOrganizations(organizations), [organizations, setOrganizations]);

	const { value: NewOrgViews, setValue: setAllOrgViews } = useStateManagement(ORG_VIEWS_KEY, orgViews);
	useEffect(() => setAllOrgViews(orgViews), [orgViews, setAllOrgViews]);
	// Writes through the query cache (what useStateManagement reads) so concurrent updates never drop each other.
	const queryClient = useQueryClient();
	const setOrgViews = useCallback(
		(orgId: string, views: schema.savedViewType[]) => {
			queryClient.setQueryData<ContextType["orgViews"]>([ORG_VIEWS_KEY], (prev) => ({ ...prev, [orgId]: views }));
		},
		[queryClient]
	);

	// Fetch initial unread notification count
	useEffect(() => {
		notificationActions.refresh();
	}, []);

	// Fetch personal views once so the Favourites sidebar (mounted on every admin page) has
	// them — /home itself overrides this via hydrate() from its own loader, so no flash there.
	useEffect(() => {
		personalViewsActions.refresh();
		favouritesActions.refresh();
	}, []);

	// Global WS listener: notification counts, and org view changes (the sidebar's org sections, favourites)
	const handleNotificationWS = useCallback(
		(event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);
				if (data.type === "UPDATE_VIEWS") {
					// An org's shared views changed (renamed, deleted…): keep any favourited ones in the sidebar current.
					if (data.scope === "INDIVIDUAL" && data.meta?.orgId && Array.isArray(data.data)) {
						setOrgViews(data.meta.orgId, data.data);
						favouritesActions.syncOrgViews(data.meta.orgId, data.data);
					}
				} else if (data.type === "NEW_NOTIFICATION") {
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
		},
		[setOrgViews]
	);

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleNotificationWS);
		return () => {
			serverEvents.event?.removeEventListener("message", handleNotificationWS);
		};
	}, [serverEvents.event, handleNotificationWS]);

	return (
		<RootContext.Provider
			value={{
				account: Newaccount,
				setAccount,
				organizations: NewOrganizations,
				setOrganizations,
				orgViews: NewOrgViews,
				setOrgViews,
				serverEvents,
				aiEnabled,
			}}
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

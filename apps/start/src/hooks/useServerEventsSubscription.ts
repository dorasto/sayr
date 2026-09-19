import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useRef } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import type useServerEvents from "@/lib/serverEvents";
import type { ServerEventMessage } from "../lib/serverEvents";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";

interface UseSSESubscriptionOptions {
	serverEvents: ReturnType<typeof useServerEvents>;
	orgId?: string | null;
	/** Multi-org subscribe (e.g. the cross-org board on /home) — mutually exclusive with `orgId`. */
	orgIds?: string[];
	channel?: string | null;
	organization?: schema.OrganizationWithMembers | null;
	setOrganization?: (newValue: schema.OrganizationWithMembers) => void;
}

interface UseSSEReturn {
	sseSubscribedState: { orgId?: string; orgIds?: string[]; channel?: string } | null;
}

export function useServerEventsSubscription({
	serverEvents,
	orgId,
	orgIds,
	channel,
	organization,
	setOrganization,
}: UseSSESubscriptionOptions): UseSSEReturn {
	const { organizations, setOrganizations } = useLayoutData();

	const { value: sseSubscribedState, setValue: setSSESubscribedState } = useStateManagement<{
		orgId?: string;
		orgIds?: string[];
		channel?: string;
	} | null>("sse-subscribe-state", null);

	const serverEventsRef = useRef(serverEvents);
	serverEventsRef.current = serverEvents;

	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_ORG: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations) {
				setOrganizations(organizations.map((org) => (org.id === msg.data.id ? { ...org, ...msg.data } : org)));
			} else if (organization && setOrganization) {
				setOrganization({ ...organization, ...msg.data });
			}
		},
	};

	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	// connect / reconnect effect (fixed)
	useEffect(() => {
		const se = serverEventsRef.current;
		if (!se) return;

		const currOrgId = orgId ?? null;
		const currChannel = channel ?? null;
		const currOrgIds = orgIds && orgIds.length > 0 ? [...orgIds].sort() : null;

		const prevOrgId = sseSubscribedState?.orgId ?? null;
		const prevChannel = sseSubscribedState?.channel ?? null;
		const prevOrgIds = sseSubscribedState?.orgIds ? [...sseSubscribedState.orgIds].sort() : null;

		const orgIdsUnchanged =
			currOrgIds === null
				? prevOrgIds === null
				: prevOrgIds !== null &&
					currOrgIds.length === prevOrgIds.length &&
					currOrgIds.every((id, index) => id === prevOrgIds[index]);

		// skip if unchanged
		if (prevOrgId === currOrgId && prevChannel === currChannel && orgIdsUnchanged) return;

		se.connect(currOrgId ?? undefined, currChannel ?? undefined, currOrgIds ?? undefined);

		setSSESubscribedState({
			orgId: currOrgId ?? undefined,
			orgIds: currOrgIds ?? undefined,
			channel: currChannel ?? undefined,
		});

		console.info("🔄 SSE Connected", {
			orgId: currOrgId,
			orgIds: currOrgIds,
			channel: currChannel,
		});
	}, [orgId, orgIds, channel, setSSESubscribedState]); // removed sseSubscribedState

	// subscribe to SSE messages
	useEffect(() => {
		const se = serverEventsRef.current;
		if (!se?.event) return;

		const evt = se.event;
		evt.addEventListener("message", handleMessage);

		return () => {
			evt.removeEventListener("message", handleMessage);
		};
	}, [handleMessage, serverEventsRef.current?.event]);

	return { sseSubscribedState };
}

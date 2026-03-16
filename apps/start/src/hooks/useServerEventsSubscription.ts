import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useRef } from "react";
import { useLayoutData } from "@/components/generic/Context";
import type { WSMessage } from "../lib/ws";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";
import useServerEvents from "@/lib/serverEvents";

interface UseSSESubscriptionOptions {
	serverEvents: ReturnType<typeof useServerEvents>;
	orgId?: string | null;
	channel?: string | null;
	organization?: schema.OrganizationWithMembers | null;
	setOrganization?: (newValue: schema.OrganizationWithMembers) => void;
}

interface UseSSEReturn {
	sseSubscribedState: { orgId?: string; channel?: string } | null;
}

export function useServerEventsSubscription({
	serverEvents,
	orgId,
	channel,
	organization,
	setOrganization,
}: UseSSESubscriptionOptions): UseSSEReturn {
	const { organizations, setOrganizations } = useLayoutData();

	const { value: sseSubscribedState, setValue: setSSESubscribedState } =
		useStateManagement<{ orgId?: string; channel?: string } | null>(
			"sse-subscribe-state",
			null
		);

	const serverEventsRef = useRef(serverEvents);
	serverEventsRef.current = serverEvents;

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_ORG: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations) {
				setOrganizations(
					organizations.map((org) =>
						org.id === msg.data.id ? { ...org, ...msg.data } : org
					)
				);
			} else if (organization && setOrganization) {
				setOrganization({ ...organization, ...msg.data });
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers);

	// connect / reconnect effect
	useEffect(() => {
		const se = serverEventsRef.current;
		if (!se) return;

		const currOrgId = orgId ?? null;
		const currChannel = channel ?? null;

		// get previous from persisted state
		const prevOrgId = sseSubscribedState?.orgId ?? null;
		const prevChannel = sseSubscribedState?.channel ?? null;

		// skip if nothing changed
		if (prevOrgId === currOrgId && prevChannel === currChannel) {
			return;
		}

		// connect with new org/channel - serverEvents handles disconnect internally
		se.connect(currOrgId ?? undefined, currChannel ?? undefined);
		setSSESubscribedState({ orgId: currOrgId ?? undefined, channel: currChannel ?? undefined });

		console.info("🔄 SSE Connected", { orgId: currOrgId, channel: currChannel });
	}, [orgId, channel, sseSubscribedState, setSSESubscribedState]);

	// subscribe to SSE messages
	useEffect(() => {
		const se = serverEventsRef.current;
		if (!se?.event) return;

		const evt = se.event;
		evt.addEventListener("message", handleMessage);

		return () => {
			evt.removeEventListener("message", handleMessage);
		};
	}, [handleMessage]);

	return { sseSubscribedState };
}

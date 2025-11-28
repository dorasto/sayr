import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect } from "react";
import { useLogger } from "@/app/lib/axiom/client";
import { useLayoutData } from "../admin/Context";
import type { WSMessage } from "../lib/ws";
import { useWSMessageHandler, type WSMessageHandler } from "./useWSMessageHandler";

interface UseWebSocketSubscriptionOptions {
	ws: WebSocket | null;
	orgId?: string | null;
	channel?: string | null;
	organization?: schema.OrganizationWithMembers | null;
	setOrganization?: (newValue: schema.OrganizationWithMembers) => void;
}
interface UseWebSocketSubscriptionReturn {
	wsSubscribedState: { orgId: string; channel: string } | null;
}
export function useWebSocketSubscription({
	ws,
	orgId,
	channel,
	organization,
	setOrganization,
}: UseWebSocketSubscriptionOptions): UseWebSocketSubscriptionReturn {
	const log = useLogger();
	const { organizations, setOrganizations } = useLayoutData();
	const { value: wsSubscribedState, setValue: setWSSubscribedState } = useStateManagement<{
		orgId: string;
		channel: string;
	} | null>("ws-subscribe-state", null);
	const { value: WSClientId } = useStateManagement<string>("ws-clientId", "");
	// Define handlers for message types
	const handlers: WSMessageHandler<WSMessage> = {
		SUBSCRIBED: (msg) => {
			log.debug("WebSocket Subscribed", { orgId: msg.data.orgId, channel: msg.data.channel });
			setWSSubscribedState({
				orgId: msg.data.orgId,
				channel: msg.data.channel,
			});
		},
		UPDATE_ORG: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations) {
				setOrganizations(organizations.map((org) => (org.id === msg.data.id ? { ...org, ...msg.data } : org)));
			} else if (organization && setOrganization) {
				setOrganization({ ...organization, ...msg.data });
			}
		},
	};

	// Stable handler for WebSocket `onmessage`
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => log.warn("⚠️ [UNHANDLED MESSAGE useWebSocketSubscription]", { msg }),
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: <will fix at somepoint>
	useEffect(() => {
		if (!ws) {
			setWSSubscribedState(null);
			return;
		}
		let cancelled = false; // mark stale subscriptions
		ws.addEventListener("message", handleMessage);
		// Gather current / previous values -----
		const prev = wsSubscribedState;
		const prevOrgId = prev?.orgId ?? null;
		const prevChannel = prev?.channel ?? null;
		const sameOrg = prevOrgId === orgId;
		const sameChannel = prevChannel === channel;
		// Determine if anything changed -----
		const changed = !sameOrg || !sameChannel;
		// delay sending to let old hook unmount cleanly
		const id = setTimeout(() => {
			if (cancelled) return;
			if (!orgId || !channel) {
				if (ws.readyState === WebSocket.OPEN && WSClientId) {
					ws.send(JSON.stringify({ type: "UNSUBSCRIBE" }));
					setWSSubscribedState({ orgId: "WAITING_ROOM", channel: "main" });
				}
				return () => {
					ws.removeEventListener("message", handleMessage);
					setWSSubscribedState(null);
				};
			}
			if (changed && ws.readyState === WebSocket.OPEN && WSClientId) {
				ws.send(JSON.stringify({ type: "SUBSCRIBE", orgId, channel }));
				setWSSubscribedState({ orgId, channel });
				log.info("🔄 Subscribed to", { orgId, channel });
			}
		}, 50); // small delay avoids cross-layout overlap
		return () => {
			cancelled = true;
			clearTimeout(id);
			ws.removeEventListener("message", handleMessage);
		};
		// ✅ wsSubscribedState stays in deps safely because we’re comparing before set
	}, [ws, orgId, channel, handleMessage, setWSSubscribedState, WSClientId, log]);

	return { wsSubscribedState };
}

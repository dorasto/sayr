import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect } from "react";
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
	const { organizations, setOrganizations } = useLayoutData();
	const { value: wsSubscribedState, setValue: setWSSubscribedState } = useStateManagement<{
		orgId: string;
		channel: string;
	} | null>("ws-subscribe-state", null);
	// Define handlers for message types
	const handlers: WSMessageHandler<WSMessage> = {
		SUBSCRIBED: (msg) => {
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
		CREATE_PROJECT: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations) {
				setOrganizations(
					organizations.map((org) =>
						org.id === msg.data.organizationId ? { ...org, projects: [...org.projects, msg.data] } : org
					)
				);
			} else if (organization && setOrganization) {
				setOrganization({ ...organization, projects: [...organization.projects, msg.data] });
			}
		},
	};

	// Stable handler for WebSocket `onmessage`
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE useWebSocketSubscription]", msg),
	});
	// biome-ignore lint/correctness/useExhaustiveDependencies: <will fix at somepoint>
	useEffect(() => {
		if (!ws) {
			setWSSubscribedState(null);
			return;
		}
		let cancelled = false; // mark stale subscriptions
		ws.addEventListener("message", handleMessage);

		if (!orgId || !channel) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "UNSUBSCRIBE" }));
				setWSSubscribedState({ orgId: "WAITING_ROOM", channel: "main" });
			}
			return () => {
				ws.removeEventListener("message", handleMessage);
				setWSSubscribedState(null);
			};
		}
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
			if (changed && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "SUBSCRIBE", orgId, channel }));
				setWSSubscribedState({ orgId, channel });
				console.log("🔄 Subscribed to", { orgId, channel });
			}
		}, 50); // small delay avoids cross-layout overlap
		return () => {
			cancelled = true;
			clearTimeout(id);
			ws.removeEventListener("message", handleMessage);
		};
		// ✅ wsSubscribedState stays in deps safely because we’re comparing before set
	}, [ws, orgId, channel, handleMessage, setWSSubscribedState]);

	return { wsSubscribedState };
}

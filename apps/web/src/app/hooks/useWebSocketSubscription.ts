import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
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
	messages: WSMessage[];
	clearMessages: () => void;
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
	const [messages, setMessages] = useState<WSMessage[]>([]);
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
		onEach: (msg) => setMessages((prev) => [...prev, msg]),
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE]", msg),
	});
	useEffect(() => {
		if (!ws) {
			setWSSubscribedState(null);
			return;
		}

		ws.addEventListener("message", handleMessage);

		if (!orgId || !channel) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "UNSUBSCRIBE" }));
			}
			setWSSubscribedState({ orgId: "WAITING_ROOM", channel: "main" });
			return () => {
				ws.removeEventListener("message", handleMessage);
				setWSSubscribedState(null);
			};
		}

		// 👉 Subscribe with the *current* org/channel
		if (orgId && channel) {
			const payload = { type: "SUBSCRIBE", orgId, channel };
			ws.send(JSON.stringify(payload));
		}

		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, orgId, channel, handleMessage, setWSSubscribedState]);

	const clearMessages = () => setMessages([]);

	return { messages, clearMessages, wsSubscribedState };
}

import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback, useEffect, useState } from "react";
import type { WSMessage } from "../lib/ws";

interface UseWebSocketSubscriptionOptions {
	ws: WebSocket | null;
	orgId?: string | null;
	channel?: string | null;
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
}: UseWebSocketSubscriptionOptions): UseWebSocketSubscriptionReturn {
	const [messages, setMessages] = useState<WSMessage[]>([]);
	const { value: wsSubscribedState, setValue: setWSSubscribedState } = useStateManagement<{
		orgId: string;
		channel: string;
	} | null>("ws-subscribe-state", null);

	// stable handler
	const handleMessage = useCallback(
		(event: MessageEvent) => {
			const data = JSON.parse(event.data) as WSMessage;
			setMessages((prev) => [...prev, data]);
			if (data.type === "SUBSCRIBED" && orgId && channel) {
				setWSSubscribedState({ orgId: data.data.orgId, channel: data.data.channel });
			}
		},
		[orgId, channel, setWSSubscribedState]
	);

	useEffect(() => {
		if (!ws) {
			setWSSubscribedState(null);
			return;
		}

		ws.addEventListener("message", handleMessage);

		if (!orgId || !channel) {
			setWSSubscribedState({
				orgId: "WAITING_ROOM",
				channel: "main",
			});
			return () => {
				ws.removeEventListener("message", handleMessage);
			};
		}

		// SUBSCRIBE
		const payload = { type: "SUBSCRIBE", orgId, channel };
		ws.send(JSON.stringify(payload));

		// cleanup
		return () => {
			ws.removeEventListener("message", handleMessage);
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: "UNSUBSCRIBE" }));
			}
			setWSSubscribedState(null);
		};
	}, [ws, orgId, channel, handleMessage, setWSSubscribedState]);

	const clearMessages = () => setMessages([]);

	return { messages, clearMessages, wsSubscribedState };
}

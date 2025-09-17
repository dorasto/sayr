"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
import { useWSMessageHandler, type WSMessageHandler } from "../hooks/useWSMessageHandler";
import type { WSMessage } from "./ws";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
let webSocket: WebSocket | null = null;

const useWebSocketPublic = ({
	organization,
	setOrganization,
}: {
	organization: schema.organizationType;
	setOrganization: (newValue: schema.organizationType) => void;
}) => {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { setValue: setWSClientId } = useStateManagement<string>("ws-clientId", "");
	const handlers: WSMessageHandler<WSMessage> = {
		CONNECTION_STATUS: (msg) => {
			setWSStatus("Connected");
			setWSClientId(msg.data.wsClientId);
		},
		PING: () => {
			webSocket?.send(JSON.stringify({ type: "PONG", ts: Date.now() } as WSMessage));
		},
		UPDATE_ORG: (msg) => {
			setOrganization({ ...organization, ...msg.data });
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE]", msg),
	});
	useEffect(() => {
		const abortController = new AbortController();
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(`${wsUrl}?orgId=${organization.id}` || "/ws");
				webSocket.onopen = () => {
					setWs(webSocket);
				};
				webSocket.addEventListener("message", handleMessage, { signal: abortController.signal });
				webSocket.onclose = () => {
					webSocket = null;
					console.log("WebSocket disconnected. Attempting to reconnect...");
					setWs(null);
					setWSStatus("Reconnecting");
					connectWebSocket();
				};

				webSocket.onerror = (error) => {
					console.error("WebSocket error:", error);
					if (webSocket && webSocket.readyState === WebSocket.OPEN) {
						webSocket.close();
					}
					webSocket = null;
					setWs(null);
					setWSStatus("Disconnected");
				};
			}
		};

		const timeoutId = setTimeout(() => {
			connectWebSocket();
		}, 100);

		return () => {
			console.log("Clearing WebSocket on unmount.");
			clearTimeout(timeoutId);
			webSocket?.close();
			abortController.abort();
		};
	}, [setWSStatus, organization.id, handleMessage]);
	return ws;
};

export default useWebSocketPublic;

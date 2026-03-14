"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useRef, useState } from "react";
import { useWSMessageHandler, type WSMessageHandler } from "../hooks/useWSMessageHandler";
import type { WSMessage } from "./ws";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";

let webSocket: WebSocket | null = null;

const useWebSocketPublic = ({
	organization,
	setOrganization,
}: {
	organization: schema.OrganizationWithMembers;
	setOrganization: (newValue: schema.OrganizationWithMembers) => void;
}) => {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { setValue: setWSClientId } = useStateManagement<string>("ws-clientId", "");
	const disconnectTimeRef = useRef<number | null>(null);
	const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
	const handlers: WSMessageHandler<WSMessage> = {
		CONNECTION_STATUS: (msg) => {
			setWSStatus("Connected");
			setWSClientId(msg.data.wsClientId);
			if (disconnectTimeRef.current !== null) {
				if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = setTimeout(() => {
					sendWindowMessage(window, { type: "WS_RECONNECTED" }, "*");
					disconnectTimeRef.current = null;
				}, 2000);
			}
		},
		PING: () => {
			webSocket?.send(JSON.stringify({ type: "PONG", meta: { ts: Date.now() } } as WSMessage));
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
				webSocket = new WebSocket(
					import.meta.env.VITE_APP_ENV === "development"
						? `ws://${window.location.hostname}:5468/ws?orgId=${organization.id}` || "/ws"
						: `/ws?orgId=${organization.id}`
				);
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
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional — setWSStatus/handleMessage are stable refs; only re-connect when org changes
	}, [organization.id]);
	return ws;
};

export default useWebSocketPublic;

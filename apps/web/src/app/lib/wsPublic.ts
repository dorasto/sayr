"use client";

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
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
	// biome-ignore lint/correctness/useExhaustiveDependencies: <need this>
	useEffect(() => {
		const abortController = new AbortController();
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(wsUrl || "/ws");
				webSocket.onopen = () => {
					setWs(webSocket);
					const payload = { type: "SUBSCRIBE", orgId: organization.id, channel: "public" };
					webSocket?.send(JSON.stringify(payload));
				};
				webSocket.addEventListener(
					"message",
					(event) => {
						try {
							const data: WSMessage = JSON.parse(event.data);
							switch (data.type) {
								case "CONNECTION_STATUS":
									setWSStatus("Connected");
									setWSClientId(data.data.wsClientId);
									return;
								case "PING":
									console.log("📡 Received PING, sending PONG...");
									webSocket?.send(JSON.stringify({ type: "PONG", ts: Date.now() } as WSMessage));
									return;
								case "UPDATE_ORG":
									setOrganization({ ...organization, ...data.data });
									return;
								default:
									console.log("📩 switch default:", data);
									break;
							}
						} catch {
							console.log("📩 Raw:", event.data);
						}
					},
					{ signal: abortController.signal }
				);
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
	}, [setWSStatus, setWSClientId, organization.id, setOrganization]);
	return ws;
};

export default useWebSocketPublic;

"use client";

import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
let webSocket: WebSocket | null = null;

const useWebSocket = () => {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { setValue: setWSClientId } = useStateManagement<string>("ws-clientId", "");
	useEffect(() => {
		const abortController = new AbortController();
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(wsUrl || "/ws");
				webSocket.onopen = () => {
					setWs(webSocket);
				};
				webSocket.addEventListener(
					"message",
					(event) => {
						try {
							const data: WSMessage = JSON.parse(event.data);
							switch (data.type) {
								case "CONNECTION_STATUS":
									if (data.data.authenticated) {
										setWSStatus("Connected");
										setWSClientId(data.data.wsClientId);
									} else {
										webSocket = null;
										console.log("WebSocket disconnected. Attempting to reconnect...");
										setWs(null);
										setWSStatus("Reconnecting");
										connectWebSocket();
									}
									return;
								case "PING":
									console.log("📡 Received PING, sending PONG...");
									webSocket?.send(JSON.stringify({ type: "PONG", ts: Date.now() } as WSMessage));
									return;
								default:
									console.log("📩 switch Raw:", event.data);
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
	}, [setWSStatus, setWSClientId]);
	return ws;
};

export default useWebSocket;

// Base message type with optional metadata
export type BaseMessage = {
	meta?: {
		ts: number; // timestamp
		channel?: string;
		orgId?: string;
	};
};

export type WSMessage =
	| (BaseMessage & {
			type: "CONNECTION_STATUS";
			data: { status: string; authenticated: boolean; wsClientId: string };
	  })
	| (BaseMessage & {
			type: "SERVER_MESSAGE" | "ERROR";
			data: { message: string };
	  })
	| (BaseMessage & {
			type: "PING" | "PONG";
			ts: number;
	  })
	| (BaseMessage & {
			type: "MESSAGE";
			data: {
				channel?: string;
				text?: string;
			};
	  })
	| (BaseMessage & {
			type: "SUBSCRIBED";
			channel?: string;
	  })
	| (BaseMessage & {
			type: "FIREHOSE";
			data: {
				channel: string;
				payload: {
					type: "MESSAGE";
					data: {
						text: string;
						wsClientId: string;
						clientId: string;
					};
				};
			};
	  });

// Messages the client can send to the server
export type WSMessageSend =
	| BaseMessage
	| (BaseMessage & {
			type: "SUBSCRIBE";
			orgId: string;
			channel: string;
			timestamp: string;
	  });

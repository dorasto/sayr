"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";

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
										headlessToast.success({
											id: "ws-connection-status",
											title: "WebSocket Connected",
											description: "Successfully connected to server",
										});
									} else {
										webSocket = null;
										console.log("WebSocket disconnected. Attempting to reconnect...");
										setWs(null);
										setWSStatus("Reconnecting");
										headlessToast.error({
											id: "ws-connection-status",
											title: "Connection failure",
											description: "There appears to be a connection problem. ",
											action: {
												label: "Reload",
												onClick: () => window.location.reload(),
											},
											duration: Infinity, // Make it persistent
										});
										connectWebSocket();
									}
									return;
								case "PING":
									webSocket?.send(JSON.stringify({ type: "PONG", ts: Date.now() } as WSMessage));
									return;
								default:
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
					headlessToast.error({
						id: "ws-connection-status",
						title: "Connection failure",
						description: "There appears to be a connection problem. ",
						duration: Infinity, // Make it persistent
						action: {
							label: "Reload",
							onClick: () => window.location.reload(),
						},
					});
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
					headlessToast.error({
						id: "ws-connection-status",
						title: "Connection failure",
						description: "There appears to be a connection problem. ",
						action: {
							label: "Reload",
							onClick: () => window.location.reload(),
						},
						duration: Infinity, // Make it persistent
					});
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
			// Clean up any persistent toast
			sonnerToast.dismiss("ws-connection-status");
		};
	}, [setWSStatus, setWSClientId]);
	return ws;
};

export default useWebSocket;

// Base message type with optional metadata
export type BaseMessage = {
	scope: "INDIVIDUAL" | "CHANNEL" | "PUBLIC";
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
			data: {
				orgId: string;
				channel: string;
			};
	  })
	| (BaseMessage & {
			type: "UPDATE_ORG";
			data: schema.organizationType;
	  })
	| (BaseMessage & {
			type: "CREATE_PROJECT";
			data: schema.projectType;
	  })
	| (BaseMessage & {
			type: "CREATE_TASK";
			data: schema.TaskWithLabels;
	  })
	| (BaseMessage & {
			type: "UPDATE_TASK";
			data: schema.TaskWithLabels;
	  })
	| (BaseMessage & {
			type: "FIREHOSE";
			data: {
				channel: string;
				payload: WSMessage;
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

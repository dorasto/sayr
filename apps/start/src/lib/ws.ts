"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";

// import { useLogger } from "@/app/lib/axiom/client";

let webSocket: WebSocket | null = null;
let lastMessageTimestamp: number = Date.now();

const useWebSocket = () => {
	// const log = useLogger();
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { setValue: setWSClientId } = useStateManagement<string>("ws-clientId", "");
	useEffect(() => {
		const abortController = new AbortController();
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(import.meta.env.VITE_WS_URL || "/ws");
				webSocket.onopen = () => {
					console.info("WebSocket connection established");
					lastMessageTimestamp = Date.now();
					setWs(webSocket);
				};
				webSocket.addEventListener(
					"message",
					(event) => {
						lastMessageTimestamp = Date.now();
						try {
							const data: WSMessage = JSON.parse(event.data);
							switch (data.type) {
								case "CONNECTION_STATUS":
									if (data.data.authenticated) {
										setWSStatus("Connected");
										setWSClientId(data.data.wsClientId);
										console.info("WebSocket authenticated", { wsClientId: data.data.wsClientId });
										// headlessToast.success({
										// 	id: "ws-connection-status",
										// 	title: "WebSocket Connected",
										// 	description: "Successfully connected to server",
										// });
									} else {
										webSocket?.close();
										webSocket = null;
										console.warn("WebSocket disconnected (unauthenticated)");
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
									}
									return;
								case "PING": {
									const pong = { type: "PONG", meta: { ts: Date.now() } } as WSMessage;
									webSocket?.send(JSON.stringify(pong));
									return;
								}
								case "MEMBER_ACTIONS": {
									if (data.data.action === "REMOVED") {
										headlessToast.info({
											id: "org-member-removed",
											title: "Removed from organization",
											description: "You have been removed from the organization. Redirecting...",
										});
										setTimeout(() => {
											window.location.href = "/admin";
										});
									}
									return;
								}
								default:
									break;
							}
						} catch (error) {
							console.error("WebSocket message parse error", { error, data: event.data });
						}
					},
					{ signal: abortController.signal }
				);
				webSocket.onclose = (event) => {
					webSocket = null;
					console.info("WebSocket disconnected", {
						code: event.code,
						reason: event.reason,
						wasClean: event.wasClean,
					});
					setWs(null);
					setWSClientId("");
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
					console.error("WebSocket error", { error });
					if (webSocket && webSocket.readyState === WebSocket.OPEN) {
						webSocket.close();
					}
					webSocket = null;
					setWs(null);
					setWSClientId("");
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

		// Watchdog interval: Check every 5s if we haven't received a message in 45s
		const watchdogInterval = setInterval(() => {
			if (webSocket && webSocket.readyState === WebSocket.OPEN) {
				const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
				if (timeSinceLastMessage > 45000) {
					console.warn(`⚠️ No messages for ${timeSinceLastMessage}ms. Force closing.`);
					// log.warn("WebSocket watchdog timeout", { timeSinceLastMessage });
					webSocket.close(4000, "Watchdog timeout");
				}
			}
		}, 5000);

		// Online/Offline listeners
		const handleOnline = () => {
			console.info("Browser online");
			if (!webSocket || webSocket.readyState === WebSocket.CLOSED) {
				connectWebSocket();
			}
		};
		const handleOffline = () => {
			console.info("Browser offline");
		};
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			console.log("Clearing WebSocket on unmount.");
			clearTimeout(timeoutId);
			clearInterval(watchdogInterval);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			webSocket?.close();
			abortController.abort();
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
			type: "UPDATE_CATEGORIES";
			data: schema.categoryType[];
	  })
	| (BaseMessage & {
			type: "UPDATE_LABELS";
			data: schema.labelType[];
	  })
	| (BaseMessage & {
			type: "UPDATE_VIEWS";
			data: schema.savedViewType[];
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
			type: "UPDATE_TASK_COMMENTS";
			data: {
				id: string;
			};
	  })
	| (BaseMessage & {
			type: "FIREHOSE";
			data: {
				channel: string;
				payload: WSMessage;
			};
	  })
	| (BaseMessage & {
			type: "CONNECTIONS_SNAPSHOT";
			data: FirehoseClient[];
	  })
	| (BaseMessage & {
			type: "MEMBER_ACTIONS";
			data: { action: "ADDED" | "REMOVED"; orgId: string; userId: string };
	  });

export type FirehoseClient = {
	wsClientId: string;
	clientId: string;
	orgId: string;
	channel: string;
	lastPong: number;
	lastLatency: number;
	lastMessageAt: number;
	connectedAt: number;
	authenticated: boolean;
};

"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { useEffect, useRef, useState } from "react";

// import { useLogger } from "@/app/lib/axiom/client";

let webSocket: WebSocket | null = null;
let lastMessageTimestamp: number = Date.now();
// track reconnect timings
const useWebSocket = () => {
	// const log = useLogger();
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { setValue: setWSClientId } = useStateManagement<string>("ws-clientId", "");
	const disconnectTimeRef = useRef<number | null>(null);
	const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
	const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional empty deps — setWSStatus/setWSClientId are now stable useCallback refs; effect must only run once on mount
	useEffect(() => {
		const abortController = new AbortController();
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(
					import.meta.env.VITE_APP_ENV === "development"
						? `ws://${window.location.hostname}:5468/ws` || "/ws"
						: "/ws"
				);
			webSocket.onopen = () => {
				// console.info("WebSocket connection established");
				lastMessageTimestamp = Date.now();
				// Cancel any pending "connection failure" toast
				if (toastTimerRef.current) {
					clearTimeout(toastTimerRef.current);
					toastTimerRef.current = null;
				}
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
								// Dismiss any lingering connection failure toast on successful auth
								headlessToast.dismiss("ws-connection-status");
								// ✅ After reconnect — broadcast if stable for 2 sec
									if (disconnectTimeRef.current !== null) {
										if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
										reconnectTimerRef.current = setTimeout(() => {
											sendWindowMessage(window, { type: "WS_RECONNECTED" }, "*");
											disconnectTimeRef.current = null;
										}, 2000);
									}
								} else {
									webSocket?.close();
									webSocket = null;
									// console.warn("WebSocket disconnected (unauthenticated)");
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
									const pong = {
										type: "PONG",
										meta: { ts: Date.now() },
									} as WSMessage;
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
											window.location.href = "/";
										});
									}
									return;
								}
								default:
									break;
							}
					} catch (error) {
						// console.error("WebSocket message parse error", {
						// 	error,
						// 	data: event.data,
						// });
					}
					},
					{ signal: abortController.signal }
				);
		webSocket.onclose = () => {
			webSocket = null;
			disconnectTimeRef.current = Date.now();
				setWs(null);
				setWSClientId("");
				setWSStatus("Reconnecting");
				// Delay the error toast — cancel if reconnection succeeds within 5s
				if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
				toastTimerRef.current = setTimeout(() => {
					toastTimerRef.current = null;
					headlessToast.error({
						id: "ws-connection-status",
						title: "Connection failure",
						description: "There appears to be a connection problem. ",
						duration: Infinity,
						action: {
							label: "Reload",
							onClick: () => window.location.reload(),
						},
					});
				}, 5000);
				connectWebSocket();
			};

		webSocket.onerror = () => {
			// console.error("WebSocket error", { error });
			if (webSocket && webSocket.readyState === WebSocket.OPEN) {
					webSocket.close();
				}
				webSocket = null;
				setWs(null);
				setWSClientId("");
				setWSStatus("Disconnected");
				// onclose always fires after onerror — toast is handled there with a delay
			};
			}
		};

		const timeoutId = setTimeout(() => {
			connectWebSocket();
		}, 100);

		// Watchdog interval: Check every 5s if we haven't received a message in 25s
		const watchdogInterval = setInterval(() => {
			if (webSocket && webSocket.readyState === WebSocket.OPEN) {
				const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
				if (timeSinceLastMessage > 25000) {
					// console.warn(`⚠️ No messages for ${timeSinceLastMessage}ms. Force closing.`);
					// log.warn("WebSocket watchdog timeout", { timeSinceLastMessage });
					webSocket.close(4000, "Watchdog timeout");
				}
			}
		}, 5000);

		// Online/Offline listeners
		const handleOnline = () => {
			// console.info("Browser online");
			if (!webSocket || webSocket.readyState === WebSocket.CLOSED) {
				connectWebSocket();
			}
		};
		const handleOffline = () => {
			// console.info("Browser offline");
		};
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			// console.log("Clearing WebSocket on unmount.");
			clearTimeout(timeoutId);
			clearInterval(watchdogInterval);
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			webSocket?.close();
			abortController.abort();
		};
	}, []);
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
			type: "UPDATE_ISSUE_TEMPLATES";
			data: schema.issueTemplateWithRelations[];
	  })
	| (BaseMessage & {
			type: "UPDATE_RELEASES";
			data: schema.releaseType[];
	  })
	| (BaseMessage & {
			type: "DELETE_RELEASE";
			data: { releaseId: string };
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
			type: "UPDATE_TASK_VOTE";
			data: {
				id: schema.TaskWithLabels["id"];
				voteCount: schema.TaskWithLabels["voteCount"];
			};
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
	  })
	| (BaseMessage & {
			type: "NEW_NOTIFICATION";
			data: schema.NotificationWithDetails;
	  })
	| (BaseMessage & {
			type: "NOTIFICATION_READ";
			data: { id?: string; all?: boolean; organizationId?: string };
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

import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";

// import { useLogger } from "@/app/lib/axiom/client"; // Logger removed for now

let webSocket: WebSocket | null = null;

interface WSMessage {
	type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	meta?: any;
}

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
				// Adapted for Vite env
				webSocket = new WebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws");
				webSocket.onopen = () => {
					console.log("✅ WebSocket connection established");
					// log.info("WebSocket connection established");
					setWs(webSocket);
				};
				webSocket.addEventListener(
					"message",
					(event) => {
						// Log raw message for debugging
						console.log("⬇️ WS Recv:", event.data);
						try {
							const data: WSMessage = JSON.parse(event.data);
							switch (data.type) {
								case "CONNECTION_STATUS":
									if (data.data.authenticated) {
										setWSStatus("Connected");
										setWSClientId(data.data.wsClientId);
										// log.info("WebSocket authenticated", { wsClientId: data.data.wsClientId });
										headlessToast.success({
											id: "ws-connection-status",
											title: "WebSocket Connected",
											description: "Successfully connected to server",
										});
									} else {
										webSocket = null;
										console.log("WebSocket disconnected (unauthenticated). Attempting to reconnect...");
										// log.warn("WebSocket disconnected (unauthenticated)");
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
								case "PING": {
									console.log("🚀 ~ WebSocket ~ PING:", data);
									const pong = { type: "PONG", meta: { ts: Date.now() } } as WSMessage;
									console.log("⬆️ Sending PONG:", pong);
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
							console.log("📩 Raw (parse error):", event.data, error);
							// log.error("WebSocket message parse error", { error, data: event.data });
						}
					},
					{ signal: abortController.signal }
				);
				webSocket.onclose = (event) => {
					webSocket = null;
					console.log("WebSocket disconnected. Attempting to reconnect...", {
						code: event.code,
						reason: event.reason,
					});
					setWs(null);
					setWSStatus("Disconnected");
					// Simple reconnect logic could be added here
				};
			}
		};
		connectWebSocket();
		return () => {
			abortController.abort();
		};
	}, [setWSClientId, setWSStatus]);

	return ws;
};

export default useWebSocket;

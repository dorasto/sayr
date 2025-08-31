"use client";

import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
let webSocket: WebSocket | null = null;

const useWebSocket = () => {
	const [ws, setWs] = useState<WebSocket | null>(null);
	const { setValue: setWSStatus } = useStateManagement<string>("ws-status", "Disconnected");
	useEffect(() => {
		const connectWebSocket = () => {
			if (!webSocket) {
				setWSStatus("Connecting");
				webSocket = new WebSocket(wsUrl || "/ws");
				webSocket.onopen = () => {
					setWSStatus("Connected");
					setWs(webSocket);
				};
				webSocket.addEventListener("message", (event) => {
					try {
						const data = JSON.parse(event.data);
						if (data.type === "PING") {
							console.log("📡 Received PING, sending PONG...");
							webSocket?.send(JSON.stringify({ type: "PONG", ts: Date.now() }));
							return;
						}
					} catch {
						console.log("📩 Raw:", event.data);
					}
				});
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
		};
	}, [setWSStatus]);
	return ws;
};

export default useWebSocket;

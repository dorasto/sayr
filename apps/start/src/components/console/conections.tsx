"use client";
import type { UserWithRole } from "better-auth/plugins";
import { useEffect, useState } from "react";
import { ConnectionsSnapshotTable } from "./ConnectionsSnapshotTable";
import { useLayoutData } from "../generic/Context";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import type { FirehoseClient, WSMessage } from "@/lib/ws";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";

interface Props {
	accounts:
		| { users: UserWithRole[]; total: number; limit?: number; offset?: number }
		| { users: never[]; total: number };
}

export default function AdminConnectionsPage({ accounts }: Props) {
	const { account, ws } = useLayoutData();
	useWebSocketSubscription({
		orgId: "__ADMIN__",
		channel: "__CONNECTIONS__",
		ws,
	});
	const [snapshot, setSnapshot] = useState<FirehoseClient[]>([]);

	const handlers: WSMessageHandler<WSMessage> = {
		CONNECTIONS_SNAPSHOT: (msg) => {
			setSnapshot(msg.data);
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers);

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => ws.removeEventListener("message", handleMessage);
	}, [ws, handleMessage]);
	// 🕒 Every 90 s send a "ping" or heartbeat
	useEffect(() => {
		if (!ws) return;

		const sendHeartbeat = () => {
			if (ws.readyState === WebSocket.OPEN) {
				const message = JSON.stringify({
					type: "CONNECTIONS_SNAPSHOT",
				});
				ws.send(message);
				console.log("📡 Sent admin heartbeat");
			}
		};
		const interval = setInterval(sendHeartbeat, 90_000);
		return () => clearInterval(interval);
	}, [ws]);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">👋 Welcome, {account.name}</h1>
			<ConnectionsSnapshotTable snapshot={snapshot} accounts={accounts} />
		</div>
	);
}

"use client";
import type { UserWithRole } from "better-auth/plugins";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { FirehoseClient, WSMessage } from "@/app/lib/ws";
import { ConnectionsSnapshotTable } from "./ConnectionsSnapshotTable";

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

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">👋 Welcome, {account.name}</h1>
			<ConnectionsSnapshotTable snapshot={snapshot} accounts={accounts} />
		</div>
	);
}

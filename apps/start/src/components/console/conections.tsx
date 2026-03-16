"use client";
import type { UserWithRole } from "better-auth/plugins";
import { useEffect, useState } from "react";
import { ConnectionsSnapshotTable } from "./ConnectionsSnapshotTable";
import { useLayoutData } from "../generic/Context";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";

export type FirehoseClient = {
	sseClientId: string;
	clientId: string;
	orgId: string;
	channel: string;
	lastPong: number;
	lastLatency: number;
	lastMessageAt: number;
	connectedAt: number;
	authenticated: boolean;
};

interface Props {
	accounts:
		| { users: UserWithRole[]; total: number; limit?: number; offset?: number }
		| { users: never[]; total: number };
}

export default function AdminConnectionsPage({ accounts }: Props) {
	const { account, serverEvents } = useLayoutData();
	useServerEventsSubscription({
		orgId: "__ADMIN__",
		channel: "__CONNECTIONS__",
		serverEvents,
	});
	const [snapshot, setSnapshot] = useState<FirehoseClient[]>([]);

	const handlers: WSMessageHandler<ServerEventMessage> = {
		CONNECTIONS_SNAPSHOT: (msg: ServerEventMessage & { data: FirehoseClient[] }) => {
			setSnapshot(msg.data);
		},
	} as WSMessageHandler<ServerEventMessage>;
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => serverEvents.event?.removeEventListener("message", handleMessage);
	}, [serverEvents.event, handleMessage]);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">👋 Welcome, {account.name}</h1>
			<ConnectionsSnapshotTable snapshot={snapshot} accounts={accounts} />
		</div>
	);
}

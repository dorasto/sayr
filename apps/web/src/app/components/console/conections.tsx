"use client";
import { Card } from "@repo/ui/components/card";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import type { UserWithRole } from "better-auth/plugins";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
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

function formatTimeAgo(ts: number | null) {
	if (!ts) return "Never";
	const diff = Date.now() - ts;
	const sec = Math.floor(diff / 1000);
	const min = Math.floor(sec / 60);
	if (min > 0) return `${min}m ${sec % 60}s ago`;
	return `${sec}s ago`;
}

export default function AdminConnectionsPage({ accounts }: Props) {
	const { account, ws } = useLayoutData();
	const { value: wsStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { wsSubscribedState } = useWebSocketSubscription({
		orgId: "__ADMIN__",
		channel: "__CONNECTIONS__",
		ws,
	});

	const [snapshot, setSnapshot] = useState<FirehoseClient[]>([]);
	const [lastSnapshotTs, setLastSnapshotTs] = useState<number | null>(null);

	const handlers: WSMessageHandler<WSMessage> = {
		CONNECTIONS_SNAPSHOT: (msg) => {
			setSnapshot(msg.data);
			setLastSnapshotTs(msg.meta?.ts || null);
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

			{/* ✅ WebSocket Status Section */}
			<StatusBar wsStatus={wsStatus} wsSubscribedState={wsSubscribedState} lastSnapshotTs={lastSnapshotTs} />

			<ConnectionsSnapshotTable snapshot={snapshot} accounts={accounts} />
		</div>
	);
}
function StatusDot({ color }: { color: string }) {
	return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}
export function StatusBar({
	wsStatus,
	wsSubscribedState,
	lastSnapshotTs,
}: {
	wsStatus: string;
	wsSubscribedState?: { channel: string } | null;
	lastSnapshotTs: number | null;
}) {
	const connected = wsStatus === "Connected";

	return (
		<Card className="p-3 flex flex-wrap items-center gap-6 bg-slate-900 text-white">
			{/* WebSocket */}
			<div className="flex items-center gap-2">
				<StatusDot color={connected ? "bg-green-500" : "bg-red-500"} />
				<span className="text-sm text-gray-300">WebSocket:</span>
				{connected ? (
					<span className="font-medium text-green-400 flex items-center gap-1">
						<CheckCircle2 className="w-4 h-4" />
						Connected
					</span>
				) : (
					<span className="font-medium text-red-400 flex items-center gap-1">
						<XCircle className="w-4 h-4" />
						Disconnected
					</span>
				)}
			</div>

			{/* Subscription */}
			<div className="flex items-center gap-2">
				<StatusDot color={wsSubscribedState ? "bg-green-500" : "bg-yellow-500"} />
				<span className="text-sm text-gray-300">Subscription:</span>
				{wsSubscribedState ? (
					<span className="font-mono text-xs bg-green-900 px-2 py-0.5 rounded">{wsSubscribedState.channel}</span>
				) : (
					<span className="text-yellow-400 flex items-center gap-1">
						<Clock className="w-4 h-4" />
						Pending…
					</span>
				)}
			</div>

			{/* Last Snapshot */}
			<div className="flex items-center gap-2">
				<StatusDot color={lastSnapshotTs ? "bg-blue-500" : "bg-gray-500"} />
				<span className="text-sm text-gray-300">Last Snapshot:</span>
				{lastSnapshotTs ? (
					<span className="text-blue-300 font-mono text-xs bg-blue-900 px-2 py-0.5 rounded">
						{new Date(lastSnapshotTs).toLocaleTimeString()} ({formatTimeAgo(lastSnapshotTs)})
					</span>
				) : (
					<span className="text-gray-400">No snapshot yet</span>
				)}
			</div>
		</Card>
	);
}

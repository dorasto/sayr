"use client";

import { Badge } from "@repo/ui/components/badge";
import { TableCell, TableRow } from "@repo/ui/components/table";
import { parseChannel } from "@repo/util";
import type { UserWithRole } from "better-auth/plugins";
import { memo, useEffect, useState } from "react";
import type { FirehoseClient } from "@/app/lib/ws";

function formatTime(ts: number) {
	return new Date(ts).toLocaleTimeString();
}
function formatDuration(ms: number) {
	const sec = Math.floor(ms / 1000);
	const min = Math.floor(sec / 60);
	const hr = Math.floor(min / 60);
	if (hr > 0) return `${hr}h ${min % 60}m`;
	if (min > 0) return `${min}m ${sec % 60}s`;
	return `${sec}s`;
}

type ConnectionRowProps = {
	client: FirehoseClient;
	account?: UserWithRole;
};

// ✅ Each row tracks “now” for time‑based calculations
export const ConnectionRow = memo(function ConnectionRow({ client, account }: ConnectionRowProps) {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 10000); // tick every 10s
		return () => clearInterval(id);
	}, []);

	return (
		<TableRow>
			<TableCell className="flex items-center gap-2 max-w-[200px]">
				{account?.image ? (
					// biome-ignore lint/performance/noImgElement: <no>
					<img src={account.image} alt={account.name || "User"} width={24} height={24} className="rounded-full" />
				) : (
					<div className="w-6 h-6 rounded-full bg-gray-300" />
				)}
				<span className="truncate font-mono text-xs">{account?.name || client.clientId}</span>
				{client.orgId === "__ADMIN__" && <Badge className="ml-2 bg-purple-600">ADMIN</Badge>}
			</TableCell>
			<TableCell className="font-mono text-xs">{client.wsClientId}</TableCell>
			<TableCell>{client.orgId}</TableCell>
			<TableCell>{JSON.stringify(parseChannel(client.channel), null, 4)}</TableCell>
			<TableCell>{client.lastLatency ?? "-"}</TableCell>
			<TableCell>{formatTime(client.lastPong)}</TableCell>
			<TableCell>{formatTime(client.lastMessageAt)}</TableCell>
			<TableCell>{client.connectedAt ? formatDuration(now - client.connectedAt) : "–"}</TableCell>
			<TableCell>
				{client.authenticated ? (
					<Badge className="bg-green-600 hover:bg-green-700">Yes</Badge>
				) : (
					<Badge variant="destructive">No</Badge>
				)}
			</TableCell>
		</TableRow>
	);
});

"use client";

import { Badge } from "@repo/ui/components/badge";
import { TableCell, TableRow } from "@repo/ui/components/table";
import { parseChannel } from "@repo/util";
import { memo, useEffect, useState } from "react";
import { ConnectionType, IntegrationType } from "./connections";
import { IconDeviceDesktop, IconDeviceMobile, IconHelp } from "@tabler/icons-react";
import RenderIcon from "../generic/RenderIcon";

function formatDuration(ms: number) {
	const sec = Math.floor(ms / 1000);
	const min = Math.floor(sec / 60);
	const hr = Math.floor(min / 60);
	if (hr > 0) return `${hr}h ${min % 60}m`;
	if (min > 0) return `${min}m ${sec % 60}s`;
	return `${sec}s`;
}

type ConnectionRowProps = {
	client: ConnectionType;
	integrations: IntegrationType[];
};

export const ConnectionRow = memo(function ConnectionRow({
	client,
	integrations
}: ConnectionRowProps) {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 10000);
		return () => clearInterval(id);
	}, []);
	const integrationId = client.device?.split("/")[1];
	const integration = integrationId
		? integrations.find((i) => i.id === integrationId)
		: undefined;
	return (
		<TableRow>
			{/* User column */}
			<TableCell className="flex items-center gap-2 max-w-[200px]">
				{client.account?.image ? (
					<img
						src={client.account.image}
						alt={client.account.name || "User"}
						width={24}
						height={24}
						className="rounded-full"
					/>
				) : (
					<div className="w-6 h-6 rounded-full bg-gray-300" />
				)}
				<span className="truncate font-mono text-xs">
					{client.account?.name || "Unknown"}
				</span>

				{client.account?.role === "admin" && (
					<Badge className="ml-2 bg-purple-600 hover:bg-purple-950">ADMIN</Badge>
				)}
				{client.account?.role === "system" && (
					<Badge className="ml-2 bg-yellow-600 hover:bg-purple-950">SYSTEM</Badge>
				)}
			</TableCell>

			{/* User ID column (always shown, fallback displayed here instead) */}
			<TableCell className="font-mono text-xs">{client.clientId}</TableCell>

			<TableCell className="font-mono text-xs">{client.sseClientId}</TableCell>

			<TableCell>{client.orgId}</TableCell>

			<TableCell>
				{JSON.stringify(parseChannel(client.channel), null, 4)}
			</TableCell>

			<TableCell>
				{client.connectedAt
					? formatDuration(now - client.connectedAt)
					: "–"}
			</TableCell>

			<TableCell>
				{client.authenticated ? (
					<Badge className="bg-green-600 hover:bg-green-700">Yes</Badge>
				) : (
					<Badge variant="destructive">No</Badge>
				)}
			</TableCell>
			<TableCell className="font-mono text-xs">
				<div className="flex items-center gap-2">
					{client.device === "mobile" && <IconDeviceMobile size={16} />}
					{client.device === "desktop" && <IconDeviceDesktop size={16} />}
					{!client.device && <IconHelp size={16} />}
					{integration ? (
						<>
							<RenderIcon iconName={integration.icon || ""} size={16} raw />
							{integration.name}
							{integration.enabled && <span>(Enabled)</span>}
							{integration.version && <span>v{integration.version}</span>}
							{integration.author?.name && (
								<>
									{" - "}
									<a
										href={integration.author.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										{integration.author.name}
									</a>
								</>
							)}
						</>
					) : (
						<span>{client.device || "Unknown"}</span>
					)}
				</div>
			</TableCell>
			<TableCell className="font-mono text-xs">
				{client.ref ?? "–"}
			</TableCell>
		</TableRow>
	);
});
"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@repo/ui/components/card";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow
} from "@repo/ui/components/table";
import type { ConnectionType, IntegrationType } from "./connections";
import { ConnectionRow } from "./ConnectionRow";

export function ConnectionsSnapshotTable({
	snapshot,
	integrations
}: {
	snapshot: ConnectionType[];
	integrations: IntegrationType[];
}) {
	const sorted = snapshot
		.slice()
		.sort((a, b) => (b.connectedAt || 0) - (a.connectedAt || 0));

	return (
		<Card>
			<CardHeader>
				<CardTitle>🔗 Connected Clients</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>User ID</TableHead>
							<TableHead>SSE Client ID</TableHead>
							<TableHead>Org</TableHead>
							<TableHead>Channel</TableHead>
							<TableHead>Connected For</TableHead>
							<TableHead>Auth</TableHead>
							<TableHead>Device</TableHead>
							<TableHead>Ref</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{sorted.map(client => {
							return (
								<ConnectionRow
									key={client.sseClientId}
									client={client}
									integrations={integrations}
								/>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
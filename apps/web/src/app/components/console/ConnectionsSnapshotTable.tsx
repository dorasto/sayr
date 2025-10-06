"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import type { UserWithRole } from "better-auth/plugins";
import type { FirehoseClient } from "@/app/lib/ws";
import { ConnectionRow } from "./ConnectionRow";

export function ConnectionsSnapshotTable({
	snapshot,
	accounts,
}: {
	snapshot: FirehoseClient[];
	accounts:
		| { users: UserWithRole[]; total: number; limit?: number; offset?: number }
		| { users: never[]; total: number };
}) {
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
							<TableHead>WS Client ID</TableHead>
							<TableHead>Org</TableHead>
							<TableHead>Channel</TableHead>
							<TableHead>Latency</TableHead>
							<TableHead>Last Pong</TableHead>
							<TableHead>Last Message</TableHead>
							<TableHead>Connected For</TableHead>
							<TableHead>Auth</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{snapshot
							.slice()
							.sort((a, b) => (b.connectedAt || 0) - (a.connectedAt || 0))
							.map((client) => {
								const account = accounts.users.find((e) => e.id === client.clientId) as
									| UserWithRole
									| undefined;

								return <ConnectionRow key={client.wsClientId} client={client} account={account} />;
							})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

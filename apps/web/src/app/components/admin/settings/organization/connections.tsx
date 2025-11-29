"use client";

import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import Link from "next/link";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { connections } from "./connections-data";

export default function SettingsOrganizationConnectionsPage() {
	const { ws } = useLayoutData();
	const { organization } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	if (!organization) {
		return null;
	}
	return (
		<div className="bg-card rounded-lg flex flex-col">
			{connections.map((connection) => (
				<Link
					href={`/admin/settings/org/${organization.id}/connections/${connection.id}`}
					prefetch={false}
					key={connection.id}
				>
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<div className="flex items-center gap-3">
								<TileIcon className="">
									<connection.icon />
								</TileIcon>
								<TileTitle>{connection.name}</TileTitle>
								<TileDescription className="line-clamp-1 ml-auto">{connection.description}</TileDescription>
							</div>
						</TileHeader>
					</Tile>
				</Link>
			))}
		</div>
	);
}

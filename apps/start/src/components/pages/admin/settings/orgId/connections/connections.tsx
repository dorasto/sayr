import {
	Tile,
	TileDescription,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Link } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
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
					to={`/admin/settings/org/$orgId/connections/$connectionId`}
					params={{ orgId: organization.id, connectionId: connection.id }}
					key={connection.id}
				>
					<Tile className="md:w-full" variant={"transparent"}>
						<TileHeader className="md:w-full">
							<div className="flex items-center gap-3">
								<TileIcon className="">
									<connection.icon />
								</TileIcon>
								<TileTitle>{connection.name}</TileTitle>
								<TileDescription className="line-clamp-1 ml-auto">
									{connection.description}
								</TileDescription>
							</div>
						</TileHeader>
					</Tile>
				</Link>
			))}
		</div>
	);
}

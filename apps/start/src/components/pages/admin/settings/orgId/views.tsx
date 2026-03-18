import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconSettings, IconStack2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export default function SettingsOrganizationViewsPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, views, setViews } = useLayoutOrganizationSettings();

	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setViews(msg.data);
			}
		},
	};

	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {
	});

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	if (!organization) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			{views.map((view) => (
				<Link
					key={view.id}
					to="/settings/org/$orgId/views/$viewId"
					params={{ orgId: organization.id, viewId: view.id }}
				>
					<Tile className="bg-card hover:bg-accent md:w-full transition-colors cursor-pointer">
						<TileHeader>
							<TileTitle className="flex items-center gap-2">
								<TileIcon>
									<IconStack2 />
								</TileIcon>
								{view.name}
							</TileTitle>
							<TileDescription>
								Created {view.createdAt ? new Date(view.createdAt).toLocaleDateString() : "Unknown"}
							</TileDescription>
						</TileHeader>
						<TileAction>
							<Button variant="ghost" size="icon">
								<IconSettings className="size-4" />
							</Button>
						</TileAction>
					</Tile>
				</Link>
			))}
			{views.length === 0 && (
				<div className="text-muted-foreground text-sm p-4 text-center border rounded-lg border-dashed">
					No saved views found. Create one from the project board.
				</div>
			)}
		</div>
	);
}

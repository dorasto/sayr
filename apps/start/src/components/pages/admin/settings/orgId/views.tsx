"use client";

import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconSettings, IconStack2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export default function SettingsOrganizationViewsPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, views, setViews } = useLayoutOrganizationSettings();

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setViews(msg.data);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationViewsPage]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	if (!organization) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			{views.map((view) => (
				<Link
					key={view.id}
					to="/admin/settings/org/$orgId/views/$viewId"
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

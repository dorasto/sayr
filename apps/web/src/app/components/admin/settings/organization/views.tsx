"use client";

import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconSettings, IconStack2 } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";

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
				<Link key={view.id} href={`/admin/settings/org/${organization.id}/views/${view.id}`}>
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

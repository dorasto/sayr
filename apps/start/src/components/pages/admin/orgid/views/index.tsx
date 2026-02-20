"use client";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconPlus, IconSettings, IconStack2, IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export default function OrganizationViewsPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, views, setViews } = useLayoutOrganization();

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
		// onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE OrganizationViewsPage]", msg),
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
		<>
			<PageHeader>
				<PageHeader.Identity
					actions={
						<Link to="/settings/org/$orgId/views" params={{ orgId: organization.id }}>
							<Button variant="default" size="sm" className="gap-2">
								<IconPlus className="size-4" />
								Manage Views
							</Button>
						</Link>
					}
				>
					<Link to="/$orgId" params={{ orgId: organization.id }}>
						<Button
							variant={"primary"}
							className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
							size={"sm"}
						>
							<Avatar className="h-4 w-4">
								<AvatarImage
									src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
									alt={organization.name}
								/>
								<AvatarFallback className="rounded-md uppercase text-xs">
									<IconUsers className="h-4 w-4" />
								</AvatarFallback>
							</Avatar>
							<span>{organization.name}</span>
						</Button>
					</Link>
					<span className="text-muted-foreground text-xs">/</span>
					<Button
						variant={"primary"}
						className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
						size={"sm"}
					>
						<IconStack2 className="size-3.5 text-muted-foreground" />
						<span>Views</span>
					</Button>
				</PageHeader.Identity>
			</PageHeader>
			<div className="flex flex-col gap-3 md:p-6 md:pt-3 p-3 overflow-y-auto">
				{/* Views Grid */}
				<div className="flex flex-col gap-3">
					{views.map((view) => (
						<Tile
							className={cn(
								"bg-card hover:bg-accent md:w-full transition-colors cursor-pointer h-full p-0 gap-0",
							)}
							key={view.id}
						>
							<Link
								to="/$orgId/tasks"
								params={{ orgId: organization.id }}
								search={{ view: view.slug || view.id }}
								className="w-full h-full p-6"
							>
								<TileHeader className="flex items-center gap-3 w-full">
									<TileIcon className={cn("shrink-0 p-0")}>
										<RenderIcon
											iconName={view.viewConfig?.icon || "IconStack2"}
											color={view.viewConfig?.color || "#ffffff"}
											button
											className={cn("size-5! [&_svg]:size-4! border-0")}
										/>
									</TileIcon>
									<TileTitle className="text-base font-semibold">{view.name}</TileTitle>

									<div className="flex flex-col gap-1 w-full" />
								</TileHeader>
							</Link>
							<TileAction className="p-3">
								<Link
									to="/settings/org/$orgId/views/$viewId"
									params={{ orgId: organization.id, viewId: view.id }}
									onClick={(e) => e.stopPropagation()}
									className=""
								>
									<Button variant="primary" size="icon" className="">
										<IconSettings />
									</Button>
								</Link>
							</TileAction>
						</Tile>
					))}
				</div>

				{/* Empty State */}
				{views.length === 0 && (
					<div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20">
						<IconStack2 className="size-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">No saved views yet</h3>
						<p className="text-sm text-muted-foreground mb-4 max-w-md">
							Create custom filtered views to quickly access specific sets of tasks. Views can be created
							from the tasks page or in settings.
						</p>
						<div className="flex gap-2">
							<Link to="/$orgId/tasks" params={{ orgId: organization.id }}>
								<Button variant="outline" size="sm">
									Go to Tasks
								</Button>
							</Link>
							<Link to="/settings/org/$orgId/views" params={{ orgId: organization.id }}>
								<Button variant="default" size="sm">
									Manage Views
								</Button>
							</Link>
						</div>
					</div>
				)}
			</div>
		</>
	);
}

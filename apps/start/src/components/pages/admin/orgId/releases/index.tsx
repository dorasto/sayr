"use client";
import { useLayoutData } from "@/components/generic/Context";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
	useWSMessageHandler,
	type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { Button } from "@repo/ui/components/button";
import {
	Tile,
	TileAction,
	TileHeader,
	TileIcon,
	TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { IconPlus, IconRocket, IconSettings } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreateReleaseDialog } from "./create-release-dialog";

export default function OrganizationReleasesPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, releases, setReleases } =
		useLayoutOrganization();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_RELEASES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setReleases(msg.data);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) =>
			console.warn("⚠️ [UNHANDLED MESSAGE OrganizationReleasesPage]", msg),
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

	console.log("📦 Releases data:", releases);

	// Group releases by status
	const plannedReleases = releases.filter((r) => r.status === "planned");
	const activeReleases = releases.filter((r) => r.status === "in-progress");
	const releasedReleases = releases.filter((r) => r.status === "released");
	const archivedReleases = releases.filter((r) => r.status === "archived");

	const renderReleasesList = (
		releasesList: typeof releases,
		title: string,
	) => {
		if (releasesList.length === 0) return null;

		return (
			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
				<div className="flex flex-col gap-3">
					{releasesList.map((release) => (
						<Tile
							className={cn(
								"bg-card hover:bg-accent md:w-full transition-colors cursor-pointer h-full p-0 gap-0",
							)}
							key={release.id}
						>
							<Link
								to="/$orgId/releases/$releaseSlug"
								params={{ orgId: organization.id, releaseSlug: release.slug }}
								className="w-full h-full p-6"
							>
								<TileHeader className="flex items-center gap-3 w-full">
									<TileIcon className={cn("shrink-0 p-0")}>
										{release.icon ? (
											<RenderIcon
												iconName={release.icon}
												color={release.color || "#ffffff"}
												button
												className={cn("size-5! [&_svg]:size-4! border-0")}
											/>
										) : (
											<div
												className="size-8 rounded-full flex items-center justify-center"
												style={{
													backgroundColor: release.color || "#cccccc",
												}}
											>
												<IconRocket className="size-4 text-white" />
											</div>
										)}
									</TileIcon>
									<TileTitle className="text-base font-semibold">
										{release.name}
									</TileTitle>
									<div className="flex flex-col gap-1 w-full" />
								</TileHeader>
							</Link>
							<TileAction className="p-3">
								<Link
									to="/$orgId/releases/$releaseSlug"
									params={{ orgId: organization.id, releaseSlug: release.slug }}
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
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Header with Create Button */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Releases</h2>
					<p className="text-sm text-muted-foreground">
						Track what ships in each version
					</p>
				</div>
				<Button
					variant="default"
					size="sm"
					className="gap-2"
					onClick={() => setCreateDialogOpen(true)}
				>
					<IconPlus className="size-4" />
					New Release
				</Button>
			</div>

			{/* Releases Lists */}
			<div className="flex flex-col gap-6">
				{renderReleasesList(plannedReleases, "Planned")}
				{renderReleasesList(activeReleases, "In Progress")}
				{renderReleasesList(releasedReleases, "Released")}
				{renderReleasesList(archivedReleases, "Archived")}
			</div>

			{/* Empty State */}
			{releases.length === 0 && (
				<div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20">
					<IconRocket className="size-12 text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">No releases yet</h3>
					<p className="text-sm text-muted-foreground mb-4 max-w-md">
						Create releases to track which tasks ship in each version. Releases
						help you organize work by milestones and communicate what's coming.
					</p>
					<Button
						variant="default"
						size="sm"
						className="gap-2"
						onClick={() => setCreateDialogOpen(true)}
					>
						<IconPlus className="size-4" />
						Create Your First Release
					</Button>
				</div>
			)}

			{/* Create Dialog */}
			<CreateReleaseDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
			/>
		</div>
	);
}

"use client";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import { PlanLimitBanner } from "@/components/generic/PlanLimitBanner";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tile, TileAction, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconLock, IconPlus, IconRocket, IconSettings, IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreateReleaseDialog } from "./create-release-dialog";

export default function OrganizationReleasesPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, releases, setReleases } = useLayoutOrganization();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { canCreateResource, getLimitMessage } = usePlanLimits();
	const canCreateRelease = canCreateResource("releases");
	const releaseLimitMessage = getLimitMessage("releases");

	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setReleases(msg.data);
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

	// console.log("📦 Releases data:", releases);

	// Group releases by status
	const plannedReleases = releases.filter((r) => r.status === "planned");
	const activeReleases = releases.filter((r) => r.status === "in-progress");
	const releasedReleases = releases.filter((r) => r.status === "released");
	const archivedReleases = releases.filter((r) => r.status === "archived");

	const renderReleasesList = (releasesList: typeof releases, title: string) => {
		if (releasesList.length === 0) return null;

		return (
			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
				<div className="flex flex-col gap-3">
					{releasesList.map((release) => (
						<Tile
							className={cn(
								"bg-card hover:bg-accent md:w-full transition-colors cursor-pointer h-full p-0 gap-0"
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
									<TileTitle className="text-base font-semibold">{release.name}</TileTitle>
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
		<>
			<PageHeader>
				<PageHeader.Identity
					actions={
						canCreateRelease ? (
							<Button variant="default" size="sm" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
								<IconPlus className="size-4" />
								New Release
							</Button>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="default" size="sm" className="gap-2 opacity-50 cursor-not-allowed" disabled>
										<IconLock className="size-4" />
										New Release
									</Button>
								</TooltipTrigger>
								<TooltipContent>{releaseLimitMessage}</TooltipContent>
							</Tooltip>
						)
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
						<IconRocket className="size-3.5 text-muted-foreground" />
						<span>Releases</span>
					</Button>
				</PageHeader.Identity>
			</PageHeader>
			<div className="flex flex-col gap-6 md:p-6 md:pt-3 p-3 overflow-y-auto">
				{!canCreateRelease && (
					<PlanLimitBanner title="Releases unavailable" description={releaseLimitMessage} />
				)}
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
							Create releases to track which tasks ship in each version. Releases help you organize work by
							milestones and communicate what's coming.
						</p>
						{canCreateRelease ? (
							<Button variant="default" size="sm" className="gap-2" onClick={() => setCreateDialogOpen(true)}>
								<IconPlus className="size-4" />
								Create Your First Release
							</Button>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="default" size="sm" className="gap-2 opacity-50 cursor-not-allowed" disabled>
										<IconLock className="size-4" />
										Create Your First Release
									</Button>
								</TooltipTrigger>
								<TooltipContent>{releaseLimitMessage}</TooltipContent>
							</Tooltip>
						)}
					</div>
				)}

				{/* Create Dialog */}
				<CreateReleaseDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					disabled={!canCreateRelease}
					disabledMessage={releaseLimitMessage}
				/>
			</div>
		</>
	);
}

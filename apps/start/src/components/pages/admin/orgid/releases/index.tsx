import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import { PanelWrapper } from "@/components/generic/wrapper";
import { PlanLimitBanner } from "@/components/generic/PlanLimitBanner";
import { ReleasesListPanelContent, ReleasesListPanelHeader } from "@/components/admin/panels/releases-list";
import { ReleasesKanban } from "@/components/releases/ReleasesKanban";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import {
	useWSMessageHandler,
	type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import {
	releasesListPanelActions,
	releasesListPanelStore,
} from "@/lib/stores/releases-list-panel-store";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { ensureCdnUrl } from "@repo/util";
import {
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconLock,
	IconPlus,
	IconRocket,
	IconUsers,
} from "@tabler/icons-react";
import { Link, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect, useMemo, useState } from "react";
import { CreateReleaseDialog } from "./create-release-dialog";

type ReleaseSearch = {
	status?: string;
	targetDateFrom?: string;
	targetDateTo?: string;
	releasedFrom?: string;
	releasedTo?: string;
};

export default function OrganizationReleasesPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, releases, setReleases } = useLayoutOrganization();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { canCreateResource, getLimitMessage } = usePlanLimits();
	const canCreateRelease = canCreateResource("releases");
	const releaseLimitMessage = getLimitMessage("releases");
	const { isOpen } = useStore(releasesListPanelStore);
	const search = useSearch({ strict: false }) as ReleaseSearch;

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

	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {});

	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	// Filter releases based on query params
	const filteredReleases = useMemo(() => {
		let filtered = releases;
		if (search.status) {
			filtered = filtered.filter((r) => r.status === search.status);
		}
		if (search.targetDateFrom) {
			const from = new Date(search.targetDateFrom);
			filtered = filtered.filter((r) => r.targetDate && new Date(r.targetDate) >= from);
		}
		if (search.targetDateTo) {
			const to = new Date(search.targetDateTo);
			filtered = filtered.filter((r) => r.targetDate && new Date(r.targetDate) <= to);
		}
		if (search.releasedFrom) {
			const from = new Date(search.releasedFrom);
			filtered = filtered.filter((r) => r.releasedAt && new Date(r.releasedAt) >= from);
		}
		if (search.releasedTo) {
			const to = new Date(search.releasedTo);
			filtered = filtered.filter((r) => r.releasedAt && new Date(r.releasedAt) <= to);
		}
		return filtered;
	}, [releases, search]);

	if (!organization) {
		return null;
	}

	return (
		<div className="relative flex flex-col h-full max-h-full">
			<PageHeader>
				<PageHeader.Identity
					actions={
						<div className="flex items-center gap-2">
							{canCreateRelease ? (
								<Button
									variant="default"
									size="sm"
									className="gap-2"
									onClick={() => setCreateDialogOpen(true)}
								>
									<IconPlus className="size-4" />
									New Release
								</Button>
							) : (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="default"
											size="sm"
											className="gap-2 opacity-50 cursor-not-allowed"
											disabled
										>
											<IconLock className="size-4" />
											New Release
										</Button>
									</TooltipTrigger>
									<TooltipContent>{releaseLimitMessage}</TooltipContent>
								</Tooltip>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => releasesListPanelActions.toggle()}
							>
								{isOpen ? (
									<IconLayoutSidebarRightFilled className="size-4" />
								) : (
									<IconLayoutSidebarRight className="size-4" />
								)}
							</Button>
						</div>
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

			<PanelWrapper
				isOpen={isOpen}
				setOpen={(open) => (open ? releasesListPanelActions.open() : releasesListPanelActions.close())}
				panelHeader={<ReleasesListPanelHeader />}
				panelBody={<ReleasesListPanelContent />}
				panelDefaultSize={25}
				panelMinSize={15}
			>
				<div className="flex flex-col h-full overflow-hidden">
					{!canCreateRelease && (
						<div className="px-4 pt-3">
							<PlanLimitBanner title="Releases unavailable" description={releaseLimitMessage} />
						</div>
					)}

					{releases.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20 m-4">
							<IconRocket className="size-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No releases yet</h3>
							<p className="text-sm text-muted-foreground mb-4 max-w-md">
								Create releases to track which tasks ship in each version. Releases help you organize
								work by milestones and communicate what's coming.
							</p>
							{canCreateRelease ? (
								<Button
									variant="default"
									size="sm"
									className="gap-2"
									onClick={() => setCreateDialogOpen(true)}
								>
									<IconPlus className="size-4" />
									Create Your First Release
								</Button>
							) : (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="default"
											size="sm"
											className="gap-2 opacity-50 cursor-not-allowed"
											disabled
										>
											<IconLock className="size-4" />
											Create Your First Release
										</Button>
									</TooltipTrigger>
									<TooltipContent>{releaseLimitMessage}</TooltipContent>
								</Tooltip>
							)}
						</div>
					) : (
						<div className="flex-1 overflow-auto">
							<ReleasesKanban
								releases={filteredReleases}
								setReleases={setReleases}
								orgId={organization.id}
							/>
						</div>
					)}
				</div>
			</PanelWrapper>

			<CreateReleaseDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				disabled={!canCreateRelease}
				disabledMessage={releaseLimitMessage}
			/>
		</div>
	);
}

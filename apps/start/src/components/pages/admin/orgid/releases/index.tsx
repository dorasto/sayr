import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import {
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
	IconLock,
	IconPlus,
	IconRocket,
	IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import type { BoardCapabilities } from "@/components/board/core/capabilities";
import type { BoardScope } from "@/components/board/core/scope-config";
import { FilterBuilder } from "@/components/board/filter/filter-builder";
import { BoardScrollArea } from "@/components/board/layout/board-scroll-area";
import { BoardViewOptions } from "@/components/board/layout/board-view-options";
import { TaskCountLabel } from "@/components/board/layout/task-count-label";
import { PageHeader } from "@/components/generic/PageHeader";
import { Page } from "@/components/generic/page";
import { PlanLimitBanner } from "@/components/generic/plan-limit-banner";
import { usePage, usePanel } from "@/components/generic/use-page";
import { RELEASE_BOARD_ENTITY } from "@/components/releases/board/release-board-entity";
import type { ReleaseItem } from "@/components/releases/board/release-board-model";
import { ReleaseBoardStatsProvider, useReleaseBoardStatsQuery } from "@/components/releases/board/release-board-stats";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { upsertReleaseRow } from "@/lib/releases/release-page-event";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { OrgSettingsLink } from "../tasks/org-tasks-panel";
import { CreateReleaseDialog } from "./create-release-dialog";
import { ReleasesPanelContent } from "./releases-panel";

const RELEASES_LIST_PANEL_ID = "releases-list-panel";

// Drag between status columns (as the old releases kanban did); nothing else a task board has applies.
const RELEASE_BOARD_CAPABILITIES: BoardCapabilities = {
	canDrag: true,
	canEditFields: false,
	canSelect: false,
	canContextMenu: false,
	canBulk: false,
	canSavedViews: false,
};

const NO_LABELS: readonly schema.labelType[] = [];
const NO_CATEGORIES: readonly schema.categoryType[] = [];

/**
 * An organization's releases, on the shared board (the same system as /home and the org tasks page — see the
 * board skill) with the release entity: a full-height status kanban (or a list), the board's filter builder,
 * view options and count label in the toolbar, and the status tiles + quick filters in the side panel.
 * Filters live in `?filters`; there are no saved views (those are task-only).
 */
export default function OrganizationReleasesPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, releases, updateReleases } = useLayoutOrganization();
	// The cards' progress bars and the panel's overview: one stats query, refetched on any task, release or
	// status-update event this page receives.
	const { stats: releaseBoardStats, refresh: refreshReleaseBoardStats } = useReleaseBoardStatsQuery(organization.id);

	// --- Live updates -----------------------------------------------------------------------------
	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization,
		// Release events only go to the `releases` room (same as the release page), not `admin`.
		channel: "releases",
		setOrganization,
	});

	// Functional writes against the latest list, never one captured from a render.
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASES: (msg) => {
			const data: unknown = msg.data;
			updateReleases((prev) => upsertReleaseRow(prev, data));
			void refreshReleaseBoardStats();
		},
		// Task events reach this page as per-user (INDIVIDUAL) messages; any of them may move a release's counts.
		CREATE_TASK: () => void refreshReleaseBoardStats(),
		UPDATE_TASK: () => void refreshReleaseBoardStats(),
		UPDATE_RELEASE_STATUS_UPDATES: () => void refreshReleaseBoardStats(),
		DELETE_RELEASE: (msg) => {
			const { releaseId } = msg.data;
			updateReleases((prev) =>
				prev.some((release) => release.id === releaseId) ? prev.filter((release) => release.id !== releaseId) : prev
			);
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

	// --- Board ------------------------------------------------------------------------------------
	const users = useMemo(() => organization.members.map((member) => member.user), [organization.members]);
	const data = useMemo<BoardDataSource<ReleaseItem>>(
		() => ({
			items: releases,
			labels: NO_LABELS,
			categories: NO_CATEGORIES,
			releases,
			users,
			updateItems: (updater) => updateReleases((prev) => [...updater(prev)]),
			organizationScope: { id: organization.id, shortId: organization.shortId },
		}),
		[releases, users, updateReleases, organization.id, organization.shortId]
	);
	// `?filters` in the URL; kanban with every status column (archived included) by default.
	const boardScope = useMemo<BoardScope>(
		() => ({
			key: `releases:${organization.id}`,
			persistence: "url",
			initial: { viewMode: "kanban", grouping: "status", subGrouping: "none", showCompletedTasks: true },
		}),
		[organization.id]
	);

	return (
		<BoardProvider
			data={data}
			entity={RELEASE_BOARD_ENTITY}
			capabilities={RELEASE_BOARD_CAPABILITIES}
			scope={boardScope}
		>
			<ReleaseBoardStatsProvider stats={releaseBoardStats}>
				<OrganizationReleasesBoardPage />
			</ReleaseBoardStatsProvider>
		</BoardProvider>
	);
}

/** The page chrome + board; inside the provider because the toolbar/panel read the board's state. */
function OrganizationReleasesBoardPage() {
	const { organization, releases } = useLayoutOrganization();
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { canCreateResource, getLimitMessage } = usePlanLimits();
	const canCreateRelease = canCreateResource("releases");
	const releaseLimitMessage = getLimitMessage("releases");
	const { setPanelContent, closePanel } = usePage();
	const panel = usePanel(RELEASES_LIST_PANEL_ID);

	// ReleasesPanelContent reads everything from the board's context and view state, so it only needs handing
	// to the panel once. Gated on isRegistered: Page registers the panel in its client-only pass.
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(RELEASES_LIST_PANEL_ID, <ReleasesPanelContent />);
	}, [panel.isRegistered, setPanelContent]);

	const header = (
		<>
			<PageHeader.Identity
				actions={
					<div className="flex items-center gap-2">
						{canCreateRelease ? (
							<Button
								variant={"primary"}
								className="w-fit text-xs p-1 h-8 rounded-lg bg-transparent"
								size={"sm"}
								onClick={() => setCreateDialogOpen(true)}
							>
								<IconPlus className="size-4" />
								Create
							</Button>
						) : (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="primary"
											size="sm"
											className="gap-2 opacity-50 cursor-not-allowed h-8!"
											disabled
										/>
									}
								>
									<IconLock className="size-4" />
									New Release
								</TooltipTrigger>
								<TooltipContent>{releaseLimitMessage}</TooltipContent>
							</Tooltip>
						)}
						<Button
							type="button"
							variant="accent"
							title={panel.isOpen ? "Close side panel" : "Open side panel"}
							className={cn(
								"gap-2 h-6 w-fit bg-accent border-transparent p-1",
								!panel.isOpen && "bg-transparent"
							)}
							onClick={() =>
								panel.isOpen
									? closePanel(RELEASES_LIST_PANEL_ID)
									: sidebarActions.setOpen(RELEASES_LIST_PANEL_ID, true)
							}
						>
							{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
						</Button>
					</div>
				}
			>
				<Link to="/$orgId" params={{ orgId: organization.id }}>
					<Button variant={"primary"} className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent" size={"sm"}>
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
			<PageHeader.Toolbar
				className="border-b-0"
				left={<TaskCountLabel />}
				right={
					<>
						<FilterBuilder />
						<BoardViewOptions />
					</>
				}
			/>
		</>
	);

	return (
		<Page
			header={header}
			panels={{
				right: {
					id: RELEASES_LIST_PANEL_ID,
					header: {
						icon: (
							<Avatar className="h-4 w-4 shrink-0">
								<AvatarImage
									src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
									alt={organization.name}
								/>
								<AvatarFallback className="rounded-md uppercase text-[10px]">
									<IconUsers className="h-3 w-3" />
								</AvatarFallback>
							</Avatar>
						),
						title: organization.name,
						actions: <OrgSettingsLink organizationId={organization.id} />,
						showClose: false,
					},
					defaultOpen: true,
					width: "420px",
				},
			}}
			className="h-full"
		>
			<div className="h-full flex flex-col contain-[paint]">
				{!canCreateRelease && (
					<div className="px-4 pt-3 shrink-0">
						<PlanLimitBanner title="Releases unavailable" description={releaseLimitMessage} />
					</div>
				)}
				{releases.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted/20 m-4">
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
								<TooltipTrigger
									render={
										<Button
											variant="default"
											size="sm"
											className="gap-2 opacity-50 cursor-not-allowed"
											disabled
										/>
									}
								>
									<IconLock className="size-4" />
									Create Your First Release
								</TooltipTrigger>
								<TooltipContent>{releaseLimitMessage}</TooltipContent>
							</Tooltip>
						)}
					</div>
				) : (
					<BoardScrollArea />
				)}
			</div>

			<CreateReleaseDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				disabled={!canCreateRelease}
				disabledMessage={releaseLimitMessage}
			/>
		</Page>
	);
}

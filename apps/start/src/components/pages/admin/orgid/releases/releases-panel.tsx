import { cn } from "@repo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { useBoardEntityData } from "@/components/board/core/board-data";
import { areFiltersEqual, DEFAULT_FILTER_STATE } from "@/components/board/core/view-config";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { QuickFilterPanel } from "@/components/board/quick-filters/quick-filter-panel";
import { RELEASE_BOARD_ENTITY } from "@/components/releases/board/release-board-entity";
import {
	buildReleaseStatusFilter,
	countReleasesByStatus,
	RELEASE_STATUS_ORDER,
	type ReleaseItem,
} from "@/components/releases/board/release-board-model";
import { useReleaseBoardStats } from "@/components/releases/board/release-board-stats";
import {
	type AttentionItem,
	formatAttentionReason,
	selectNeedsAttention,
	selectRecentlyShipped,
	selectUpNext,
} from "@/components/releases/board/release-overview";
import { releaseStatusConfig } from "@/components/releases/config";
import {
	getReleaseDisplayDate,
	ReleaseIcon,
	ReleaseLeadAvatar,
	ReleaseTaskProgress,
	useReleaseLead,
} from "@/components/releases/release-parts";

/** A labelled panel section. */
function PanelSection({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-0.5">
			{/* Not an h3: the app's global heading styles would blow it up (see the ui-design-system skill). */}
			<div className="flex px-1.5 pb-1 text-[11px] text-muted-foreground">
				{label}
				{count !== undefined && <span className="ml-auto tabular-nums">{count}</span>}
			</div>
			{children}
		</section>
	);
}

function ReleaseLink({ release, children }: { release: ReleaseItem; children: ReactNode }) {
	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId: release.organizationId, releaseSlug: release.slug }}
			className="flex min-w-0 flex-col gap-1.5 rounded-lg px-1.5 py-1.5 text-xs hover:bg-accent"
		>
			{children}
		</Link>
	);
}

/** Icon, name and the compact date: the line every overview row starts with. */
function ReleaseLine({ release, emphasis = false }: { release: ReleaseItem; emphasis?: boolean }) {
	const date = getReleaseDisplayDate(release);
	return (
		<div className="flex min-w-0 items-center gap-2">
			<ReleaseIcon release={release} className="size-4! [&_svg]:size-3!" />
			<span className={cn("min-w-0 flex-1 truncate", emphasis && "font-medium")}>{release.name}</span>
			{date && (
				<time className="shrink-0 tabular-nums text-[11px] text-muted-foreground" title={date.title}>
					{date.short}
				</time>
			)}
		</div>
	);
}

function UpNextRow({ release }: { release: ReleaseItem }) {
	const lead = useReleaseLead(release);
	return (
		<ReleaseLink release={release}>
			<ReleaseLine release={release} emphasis />
			<div className="flex items-center gap-2 pl-6">
				<ReleaseTaskProgress releaseId={release.id} compact />
				{lead && <ReleaseLeadAvatar user={lead} className="size-3.5" />}
			</div>
		</ReleaseLink>
	);
}

function AttentionRow({ item }: { item: AttentionItem }) {
	const { reason, release } = item;
	// A small dot carries the health; the text stays muted.
	const dotClass =
		reason.kind === "health" ? (reason.health === "off_track" ? "bg-destructive/70" : "bg-primary") : "bg-border";
	return (
		<ReleaseLink release={release}>
			<div className="flex min-w-0 items-center gap-2">
				<span className={cn("size-1.5 shrink-0 rounded-full", dotClass)} aria-hidden />
				<span className="min-w-0 flex-1 truncate">{release.name}</span>
				<span className="shrink-0 text-[11px] text-muted-foreground">{formatAttentionReason(reason)}</span>
			</div>
		</ReleaseLink>
	);
}

/**
 * The releases page's right-panel body: compact status filters (a click filters the board, a second click clears
 * it), then an overview of the org's releases — up next (open releases by target date, with progress), needs
 * attention (bad health on the latest status update, or an in-progress release gone quiet), recently shipped — and
 * the board's quick filters (lead / creator) at the bottom. The overview reads every release, not the board's
 * filtered set; each section hides itself when it has nothing to show.
 */
export function ReleasesPanelContent() {
	const { items } = useBoardEntityData(RELEASE_BOARD_ENTITY);
	const { filters, applyFilter } = useBoardViewState();
	const stats = useReleaseBoardStats();
	const counts = useMemo(() => countReleasesByStatus(items), [items]);
	const statusFilters = useMemo(
		() => RELEASE_STATUS_ORDER.map((status) => ({ status, filters: buildReleaseStatusFilter(status) })),
		[]
	);
	const upNext = useMemo(() => selectUpNext(items), [items]);
	const shipped = useMemo(() => selectRecentlyShipped(items), [items]);
	// Waits for the stats so "No updates" isn't flashed for every release while they load.
	const attention = useMemo(
		() => (stats ? selectNeedsAttention(items, stats.latestUpdates, new Date()) : []),
		[items, stats]
	);

	return (
		<div className="relative flex w-full flex-col gap-4">
			<div className="grid grid-cols-2 gap-1.5">
				{statusFilters.map(({ status, filters: statusFilter }) => {
					const config = releaseStatusConfig[status];
					const active = areFiltersEqual(filters, statusFilter);
					return (
						<button
							key={status}
							type="button"
							// applyFilter (not clearView) keeps the view mode/grouping the viewer picked.
							onClick={() => applyFilter(active ? DEFAULT_FILTER_STATE : statusFilter)}
							className={cn(
								"flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground transition-colors",
								active ? "bg-accent" : "bg-accent/40 hover:bg-accent"
							)}
						>
							<span className={cn("flex shrink-0", active ? "text-foreground" : "text-muted-foreground")}>
								{config.icon("size-3.5")}
							</span>
							{config.label}
							<span className="ml-auto tabular-nums text-muted-foreground">{counts[status]}</span>
						</button>
					);
				})}
			</div>

			{upNext.length > 0 && (
				<PanelSection label="Up next">
					{upNext.map((release) => (
						<UpNextRow key={release.id} release={release} />
					))}
				</PanelSection>
			)}

			{attention.length > 0 && (
				<PanelSection label="Needs attention" count={attention.length}>
					{attention.map((item) => (
						<AttentionRow key={item.release.id} item={item} />
					))}
				</PanelSection>
			)}

			{shipped.length > 0 && (
				<PanelSection label="Recently shipped">
					{shipped.map((release) => (
						<ReleaseLink key={release.id} release={release}>
							<ReleaseLine release={release} />
						</ReleaseLink>
					))}
				</PanelSection>
			)}

			<div className="mx-1.5 h-px bg-border" />
			<QuickFilterPanel />
		</div>
	);
}

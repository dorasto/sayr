import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconBolt, IconCalendarOff, IconChevronUp, IconLoader2, IconMessage, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createContext, memo, type MouseEvent, useContext, useMemo } from "react";
import { Board } from "@/components/board/board";
import { type BoardDataSource, BoardProvider, useBoardData } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardColumn, BoardGroupingDefinition } from "@/components/board/config/grouping-registry";
import type { BoardCardRendererProps, BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import type { TaskGroupingId, TaskViewCombinedState } from "@/components/board/filter/types";
import { BoardKanbanView } from "@/components/board/views/board-kanban-view";
import { KANBAN_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { isUnscheduledColumnId, toBoardColumns } from "@/lib/portal/roadmap-columns";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { useBoardVote } from "../board/useBoardVote";
import { LabelTag } from "../ui/LabelTag";
import { ReleaseTag } from "../ui/ReleaseTag";
import { StatusChip } from "../ui/StatusChip";

export type RoadmapView = "status" | "release";

/** Grouping id of the roadmap's "By status" columns (Planned / In progress / Done recently). */
const ROADMAP_STATUS_GROUPING_ID = "roadmap-status";
/** Grouping id of the roadmap's "By release" columns (one per upcoming release, then Unscheduled). */
const ROADMAP_RELEASE_GROUPING_ID = "roadmap-release";

const EMPTY_LABELS: readonly schema.labelType[] = [];
const EMPTY_CATEGORIES: readonly schema.categoryType[] = [];
const EMPTY_RELEASES: readonly schema.releaseType[] = [];

// ---------------------------------------------------------------------------
// Groupings: the roadmap's columns, registered with the board's grouping registry.
// ---------------------------------------------------------------------------

const RELEASE_CHIP =
	"relative inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-muted pr-2.5 pl-[9px] font-semibold text-[12.5px] text-foreground";

/** Header chip for a release column: rocket and the release name, linking to the release page ("Unscheduled" has no link). */
function ReleaseColumnTitle({ release }: { release: PublicReleaseSummary | null }) {
	const { organization } = usePublicOrganizationLayout();
	if (!release) {
		return (
			<span className={RELEASE_CHIP}>
				<IconCalendarOff aria-hidden className="size-3.5" />
				Unscheduled
			</span>
		);
	}
	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug: organization.slug, releaseSlug: release.slug }}
			className={cn(
				RELEASE_CHIP,
				"outline-none after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] md:after:hidden hover:bg-accent"
			)}
		>
			<IconRocket aria-hidden className="size-3.5" />
			{release.name}
		</Link>
	);
}

/**
 * The kanban header shows `description` ahead of `emptyMessage`; an empty column wants the empty message instead
 * of the description (as the roadmap always showed), so the description is only set while there are cards.
 */
function withHeader(column: BoardColumn, header: BoardColumn["header"]): BoardColumn {
	return { ...column, header, description: column.items.length > 0 ? column.description : undefined };
}

/**
 * The roadmap's two groupings for the board's grouping registry. A factory because the release columns need
 * the releases' slugs/dates, which the board's own `data.releases` (full release rows) doesn't carry on the public
 * side: the caller passes the public release map and keeps the result stable (memoised on that map).
 *
 * Both own membership (the roadmap decides which posts appear and in what order — the board must not re-filter or
 * re-sort), keep empty columns (an empty "Planned" column still says so) and have no `getDropPatch` (read-only).
 */
function createRoadmapGroupings(releasesById: ReadonlyMap<string, PublicReleaseSummary>): BoardGroupingDefinition[] {
	return [
		{
			id: ROADMAP_STATUS_GROUPING_ID,
			label: "Roadmap by status",
			icon: <IconBolt className="h-4 w-4" />,
			persistable: false,
			canSubGroup: false,
			ownsMembership: true,
			keepEmptyColumns: true,
			group: (items, { now }) =>
				toBoardColumns("status", items, releasesById, now).map((column) =>
					withHeader(column, <StatusChip status={column.id} />)
				),
		},
		{
			id: ROADMAP_RELEASE_GROUPING_ID,
			label: "Roadmap by release",
			icon: <IconRocket className="h-4 w-4" />,
			persistable: false,
			canSubGroup: false,
			ownsMembership: true,
			keepEmptyColumns: true,
			group: (items, { now }) =>
				toBoardColumns("release", items, releasesById, now).map((column) =>
					withHeader(
						column,
						<ReleaseColumnTitle
							release={isUnscheduledColumnId(column.id) ? null : (releasesById.get(column.id) ?? null)}
						/>
					)
				),
		},
	];
}

// ---------------------------------------------------------------------------
// Card: one roadmap post, supplied through `renderers.card`.
// ---------------------------------------------------------------------------

interface RoadmapCardContextValue {
	/** The "By release" column already says which release it is, so the card drops its release tag there. */
	showReleaseTag: boolean;
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
}

const RoadmapCardContext = createContext<RoadmapCardContextValue | undefined>(undefined);

/** One roadmap post: key chip and votes on top, title, then release tag, one label and the comment count. */
const RoadmapBoardCard = memo(function RoadmapBoardCard({ task }: BoardCardRendererProps) {
	const context = useContext(RoadmapCardContext);
	if (context === undefined) {
		throw new Error("RoadmapBoardCard must be used within RoadmapBoard");
	}
	const { organization } = usePublicOrganizationLayout();
	const vote = useBoardVote(task);
	const label = task.labels?.[0];
	const commentCount = task.comments?.length ?? 0;
	const taskKey = formatTaskKey(organization.shortId, task.shortId);
	const linkParams = { orgSlug: organization.slug, shortId: String(task.shortId) };
	// Release tag: hidden for archived releases (nothing useful to link a reader to).
	const release = context.showReleaseTag && task.releaseId ? context.releasesById.get(task.releaseId) : undefined;
	const releaseName = release && release.status !== "archived" ? release.name : null;

	const handleVote = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		void vote.toggle();
	};

	return (
		<div className="relative rounded-lg border bg-card px-4 py-3.5 transition-colors hover:bg-accent">
			<div className="mb-2 flex items-center justify-between gap-3">
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={linkParams}
					className="relative z-10 rounded-sm font-semibold text-muted-foreground text-xs outline-none after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] md:after:hidden hover:text-foreground"
				>
					{taskKey}
				</Link>
				<button
					type="button"
					aria-pressed={vote.voted}
					aria-label={`Upvote, ${vote.voteCount} ${vote.voteCount === 1 ? "vote" : "votes"}`}
					disabled={vote.disabled}
					onClick={handleVote}
					className={cn(
						"relative z-10 -my-1 -mr-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-[13px] tabular-nums outline-none transition-colors after:absolute after:-inset-1.5 after:content-[''] md:after:hidden",
						vote.voted ? "text-primary" : "text-muted-foreground hover:text-primary focus-visible:text-primary",
						vote.disabled && "cursor-not-allowed opacity-50"
					)}
				>
					<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
					{formatCount(vote.voteCount)}
				</button>
			</div>

			<Link
				to="/orgs/$orgSlug/$shortId"
				params={linkParams}
				className="block font-semibold text-[14.5px] leading-[21px] tracking-[-0.006em] outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
			>
				{task.title}
			</Link>

			<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
				{releaseName && <ReleaseTag name={releaseName} />}
				{label && <LabelTag label={label} />}
				<span className="grow" />
				<span className="inline-flex items-center gap-[5px]">
					<IconMessage aria-hidden className="size-3.5" stroke={1.75} />
					<span className="sr-only">Comments: </span>
					{commentCount}
				</span>
			</div>
		</div>
	);
});

// ---------------------------------------------------------------------------
// Footer: shown by the board's views under the columns while the data source has another page.
// ---------------------------------------------------------------------------

function RoadmapFooter() {
	const { pagination } = useBoardData();
	if (!pagination) return null;
	return (
		<div className="flex flex-col items-start gap-2 pt-6">
			<p className="text-[13px] text-muted-foreground">Showing the most voted posts. There may be more.</p>
			<Button variant="outline" onClick={pagination.loadMore} disabled={pagination.isFetchingMore}>
				{pagination.isFetchingMore ? (
					<>
						<IconLoader2 className="animate-spin" />
						Loading
					</>
				) : (
					(pagination.loadMoreLabel ?? "Show more")
				)}
			</Button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// View: the board's kanban, laid out under the page's own scroll.
// ---------------------------------------------------------------------------

function RoadmapKanbanView({ items }: { items: readonly schema.TaskWithLabels[] }) {
	// The roadmap page scrolls as a whole (heading above, "browse open posts" card below), so the columns get no
	// bounded height of their own to scroll in — see BoardKanbanView's `pageScroll`.
	return <BoardKanbanView tasks={items} pageScroll />;
}

const ROADMAP_VIEW: BoardViewDefinition = { ...KANBAN_VIEW, component: RoadmapKanbanView };
const ROADMAP_VIEWS: readonly BoardViewDefinition[] = [ROADMAP_VIEW];
const ROADMAP_RENDERERS: BoardRenderers = { card: RoadmapBoardCard, footer: RoadmapFooter };

// ---------------------------------------------------------------------------
// Scope: the view state is derived from the segmented control, never persisted or synced to the URL.
// ---------------------------------------------------------------------------

const IGNORE_CHANGE: (next: TaskViewCombinedState) => void = () => {};

// The roadmap's grouping ids are page-local (never persisted); `pageLocalGrouping` is the one place that crosses the
// gap to the board view state's persisted `TaskGroupingId` type.
const GROUPING_BY_VIEW: Record<RoadmapView, TaskGroupingId> = {
	status: pageLocalGrouping(ROADMAP_STATUS_GROUPING_ID),
	release: pageLocalGrouping(ROADMAP_RELEASE_GROUPING_ID),
};

function buildScope(view: RoadmapView): BoardScope {
	return {
		key: "public-roadmap",
		persistence: "controlled",
		controlled: {
			state: {
				filters: DEFAULT_FILTER_STATE,
				viewConfig: {
					grouping: GROUPING_BY_VIEW[view],
					subGrouping: "none",
					showCompletedTasks: true,
					viewMode: "kanban",
					sortBy: "none",
					sortDirection: "asc",
				},
			},
			onChange: IGNORE_CHANGE,
		},
	};
}

// ---------------------------------------------------------------------------

interface RoadmapBoardProps {
	view: RoadmapView;
	tasks: readonly schema.TaskWithLabels[];
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
	/** The page cap was hit before the list ran out: counts are lower bounds and "Show more" is offered. */
	capped: boolean;
	isFetchingMore: boolean;
	onShowMore: () => void;
}

/**
 * The roadmap as a read-only board: the admin board's kanban with the portal theme, the portal `RoadmapCard`, and the
 * roadmap's own columns (`roadmap-status` / `roadmap-release` groupings) driven by the segmented control.
 * Loading/error states are the page's concern; this renders once the posts and releases are in.
 */
export function RoadmapBoard({ view, tasks, releasesById, capped, isFetchingMore, onShowMore }: RoadmapBoardProps) {
	const groupings = useMemo(() => createRoadmapGroupings(releasesById), [releasesById]);
	const scope = useMemo(() => buildScope(view), [view]);
	const data = useMemo<BoardDataSource>(
		() => ({
			items: tasks,
			labels: EMPTY_LABELS,
			categories: EMPTY_CATEGORIES,
			releases: EMPTY_RELEASES,
			pagination: { hasMore: capped, isFetchingMore, loadMore: onShowMore, loadMoreLabel: "Show more" },
		}),
		[tasks, capped, isFetchingMore, onShowMore]
	);
	const cardContext = useMemo<RoadmapCardContextValue>(
		() => ({ showReleaseTag: view === "status", releasesById }),
		[view, releasesById]
	);

	return (
		<BoardProvider
			data={data}
			capabilities={READ_ONLY_CAPABILITIES}
			scope={scope}
			groupings={groupings}
			views={ROADMAP_VIEWS}
			renderers={ROADMAP_RENDERERS}
		>
			<RoadmapCardContext.Provider value={cardContext}>
				<Board />
			</RoadmapCardContext.Provider>
		</BoardProvider>
	);
}

import type { schema } from "@repo/database";
import { IconLoader2 } from "@tabler/icons-react";
import { createContext, useContext, useMemo } from "react";
import { Board } from "@/components/board/board";
import { type BoardDataSource, BoardProvider, useBoardData } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardCardRendererProps, BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import type { TaskGroupingId, TaskViewCombinedState } from "@/components/board/filter/types";
import { BoardKanbanView } from "@/components/board/views/board-kanban-view";
import { KANBAN_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { PortalButton } from "../ui/PortalButton";
import { RoadmapCard } from "./RoadmapCard";
import type { RoadmapView } from "./RoadmapSegmented";
import { createRoadmapGroupings, ROADMAP_RELEASE_GROUPING_ID, ROADMAP_STATUS_GROUPING_ID } from "./roadmap-groupings";

const EMPTY_LABELS: readonly schema.labelType[] = [];
const EMPTY_CATEGORIES: readonly schema.categoryType[] = [];
const EMPTY_RELEASES: readonly schema.releaseType[] = [];

// ---------------------------------------------------------------------------
// Card: the portal's RoadmapCard, supplied through `renderers.card`.
// ---------------------------------------------------------------------------

interface RoadmapCardContextValue {
	/** The "By release" column already says which release it is, so the card drops its release tag there. */
	showReleaseTag: boolean;
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
}

const RoadmapCardContext = createContext<RoadmapCardContextValue | undefined>(undefined);

/** Release tag on a card: hidden for archived releases (nothing useful to link a reader to). */
function cardReleaseName(
	task: schema.TaskWithLabels,
	releasesById: ReadonlyMap<string, PublicReleaseSummary>
): string | null {
	const release = task.releaseId ? releasesById.get(task.releaseId) : undefined;
	return release && release.status !== "archived" ? release.name : null;
}

function RoadmapBoardCard({ task }: BoardCardRendererProps) {
	const context = useContext(RoadmapCardContext);
	if (context === undefined) {
		throw new Error("RoadmapBoardCard must be used within RoadmapBoard");
	}
	return (
		<RoadmapCard
			task={task}
			releaseName={context.showReleaseTag ? cardReleaseName(task, context.releasesById) : null}
		/>
	);
}

// ---------------------------------------------------------------------------
// Footer: shown by the board's views under the columns while the data source has another page.
// ---------------------------------------------------------------------------

function RoadmapFooter() {
	const { pagination } = useBoardData();
	if (!pagination) return null;
	return (
		<div className="flex flex-col items-start gap-2 pt-6">
			<p className="text-[13px] text-portal-fg-3">Showing the most voted posts. There may be more.</p>
			<PortalButton onClick={pagination.loadMore} disabled={pagination.isFetchingMore} className="max-md:h-11">
				{pagination.isFetchingMore ? (
					<>
						<IconLoader2 className="animate-spin" />
						Loading
					</>
				) : (
					(pagination.loadMoreLabel ?? "Show more")
				)}
			</PortalButton>
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
			theme="portal"
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

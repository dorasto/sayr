import type { schema } from "@repo/database";
import { IconBolt, IconRocket } from "@tabler/icons-react";
import { useMemo } from "react";
import { Board } from "@/components/board/board";
import type { BoardColumn, BoardGroupingDefinition } from "@/components/board/config/grouping-registry";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import type { TaskGroupingId, TaskViewCombinedState } from "@/components/board/filter/types";
import { PAGE_SCROLL_KANBAN_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { isUnscheduledColumnId, toBoardColumns } from "@/lib/portal/roadmap-columns";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { StatusChip } from "../ui/StatusChip";
import { ReleaseColumnTitle } from "./ReleaseColumnTitle";
import { RoadmapBoardCard, RoadmapCardContext, type RoadmapCardContextValue } from "./RoadmapBoardCard";
import { RoadmapFooter } from "./RoadmapFooter";

export type RoadmapView = "status" | "release";

/** Grouping id of the roadmap's "By status" columns (Planned / In progress / Done recently). */
const ROADMAP_STATUS_GROUPING_ID = "roadmap-status";
/** Grouping id of the roadmap's "By release" columns (one per upcoming release, then Unscheduled). */
const ROADMAP_RELEASE_GROUPING_ID = "roadmap-release";

const EMPTY_LABELS: readonly schema.labelType[] = [];
const EMPTY_CATEGORIES: readonly schema.categoryType[] = [];
const EMPTY_RELEASES: readonly schema.releaseType[] = [];

const ROADMAP_VIEWS: readonly BoardViewDefinition[] = [PAGE_SCROLL_KANBAN_VIEW];
const ROADMAP_RENDERERS: BoardRenderers = { card: RoadmapBoardCard, footer: RoadmapFooter };

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

// The view state is derived from the segmented control, never persisted or synced to the URL.
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
 * The roadmap as a read-only board: the admin board's kanban, the roadmap's own card (`RoadmapBoardCard`) and
 * footer, and the roadmap's own columns (`roadmap-status` / `roadmap-release` groupings) driven by the segmented
 * control. Loading/error states are the page's concern; this renders once the posts and releases are in.
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

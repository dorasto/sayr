import type { schema } from "@repo/database";
import { IconBolt } from "@tabler/icons-react";
import { useMemo } from "react";
import { Board } from "@/components/board/board";
import { STATUS_CONFIG, type StatusValue } from "@/components/board/config/field-config";
import type { BoardColumn, BoardGroupingDefinition } from "@/components/board/config/grouping-registry";
import { STATUS_TONE_CLASSES } from "@/components/board/config/groupings";
import { type BoardDataSource, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardRenderers } from "@/components/board/core/renderers";
import type { BoardScope } from "@/components/board/core/scope";
import { DEFAULT_FILTER_STATE, pageLocalGrouping } from "@/components/board/core/view-config";
import type { TaskViewCombinedState } from "@/components/board/filter/types";
import { KANBAN_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { toBoardColumns } from "@/lib/portal/roadmap-columns";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { RoadmapBoardCard } from "./RoadmapBoardCard";
import { RoadmapFooter } from "./RoadmapFooter";

/** Grouping id of the roadmap's columns (Planned / In progress / Done recently). */
const ROADMAP_STATUS_GROUPING_ID = "roadmap-status";

/** The full-height kanban: the host gives it a bounded height and each column scrolls on its own (like admin /home). */
const ROADMAP_VIEWS: readonly BoardViewDefinition[] = [KANBAN_VIEW];
const ROADMAP_RENDERERS: BoardRenderers = { card: RoadmapBoardCard, footer: RoadmapFooter };

/**
 * A roadmap column dressed like the admin board's status columns (the status icon and header tint from the built-in
 * status grouping). The empty message stays; the roadmap's descriptions are dropped, as admin columns have none.
 */
function asStatusColumn(column: BoardColumn): BoardColumn {
	const status = column.id as StatusValue;
	return {
		...column,
		icon: STATUS_CONFIG[status].icon("h-3.5 w-3.5"),
		toneClassName: STATUS_TONE_CLASSES[status],
		description: undefined,
	};
}

/**
 * The roadmap's grouping for the board's grouping registry. A factory because the columns read the public release map
 * (for the "Done recently" window); the caller keeps the result stable (memoised on that map).
 *
 * It owns membership (the roadmap decides which posts appear and in what order — the board must not re-filter or
 * re-sort), keeps empty columns (an empty "Planned" column still says so) and has no `getDropPatch` (read-only).
 */
function createRoadmapGroupings(releasesById: ReadonlyMap<string, PublicReleaseSummary>): BoardGroupingDefinition[] {
	return [
		{
			id: ROADMAP_STATUS_GROUPING_ID,
			label: "Roadmap",
			icon: <IconBolt className="h-4 w-4" />,
			persistable: false,
			canSubGroup: false,
			ownsMembership: true,
			keepEmptyColumns: true,
			group: (items, { now }) => toBoardColumns("status", items, releasesById, now).map(asStatusColumn),
		},
	];
}

// The view state is fixed, never persisted or synced to the URL.
const IGNORE_CHANGE: (next: TaskViewCombinedState) => void = () => {};

// The roadmap's grouping id is page-local (never persisted); `pageLocalGrouping` is the one place that crosses the
// gap to the board view state's persisted `TaskGroupingId` type.
const ROADMAP_SCOPE: BoardScope = {
	key: "public-roadmap",
	persistence: "controlled",
	controlled: {
		state: {
			filters: DEFAULT_FILTER_STATE,
			viewConfig: {
				grouping: pageLocalGrouping(ROADMAP_STATUS_GROUPING_ID),
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

interface RoadmapBoardProps {
	tasks: readonly schema.TaskWithLabels[];
	releasesById: ReadonlyMap<string, PublicReleaseSummary>;
	/** The page cap was hit before the list ran out: counts are lower bounds and "Show more" is offered. */
	capped: boolean;
	isFetchingMore: boolean;
	onShowMore: () => void;
}

/**
 * The roadmap as a read-only board: the admin board's full-height kanban, the roadmap's own card
 * (`RoadmapBoardCard`) and footer, and the roadmap's own columns (the `roadmap-status` grouping). Loading/error
 * states are the host's concern; this renders once the posts and releases are in.
 */
export function RoadmapBoard({ tasks, releasesById, capped, isFetchingMore, onShowMore }: RoadmapBoardProps) {
	const { labels, categories } = usePublicOrganizationLayout();
	const groupings = useMemo(() => createRoadmapGroupings(releasesById), [releasesById]);
	// The card's field chips (category, release, label) look their values up in these, like on admin.
	const releases = useMemo(() => [...releasesById.values()], [releasesById]);
	const data = useMemo<BoardDataSource>(
		() => ({
			items: tasks,
			labels,
			categories,
			releases,
			pagination: { hasMore: capped, isFetchingMore, loadMore: onShowMore, loadMoreLabel: "Show more" },
		}),
		[tasks, labels, categories, releases, capped, isFetchingMore, onShowMore]
	);

	return (
		<BoardProvider
			data={data}
			capabilities={READ_ONLY_CAPABILITIES}
			scope={ROADMAP_SCOPE}
			groupings={groupings}
			views={ROADMAP_VIEWS}
			renderers={ROADMAP_RENDERERS}
		>
			<Board />
		</BoardProvider>
	);
}

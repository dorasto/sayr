import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCalendar, IconListDetails, IconRocket, IconTextSize, IconUser, IconUserStar } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import type { BoardGroupingDefinition } from "@/components/board/config/grouping-registry";
import { bucketByValue, NONE_COLUMN_ID, NONE_GROUPING_ID } from "@/components/board/config/grouping-registry";
import { useBoardEntityData } from "@/components/board/core/board-data";
import type { BoardEntity, BoardEntityCardProps, BoardEntityDropExecutorProps } from "@/components/board/core/entity";
import { pageLocalGrouping } from "@/components/board/core/view-config";
import type { BoardSortFieldOption } from "@/components/board/filter/sort-config";
import type { FilterFieldConfig, FilterOption } from "@/components/board/filter/types";
import { KANBAN_VIEW, LIST_VIEW } from "@/components/board/views/view-registry";
import type { BoardViewDefinition } from "@/components/board/views/view-registry-model";
import { updateReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { releaseStatusConfig } from "../config";
import { ReleasesKanbanCard } from "../releases-kanban-card";
import {
	applyReleasePatch,
	extractReleaseFieldValue,
	getReleaseStatusDropPatch,
	isReleaseArchived,
	RELEASE_STATUS_GROUPING_ID,
	RELEASE_STATUS_ORDER,
	type ReleaseItem,
	resolveReleaseDrop,
	sortReleases,
	visibleReleaseStatuses,
} from "./release-board-model";
import { ReleaseBoardRow } from "./release-board-row";

// The board's second entity (the first is tasks, core/task-entity.tsx): an org's releases on the shared
// board — status columns, a release list row, release filters/sorts, drag-to-change-status. Lives with the
// release components rather than under components/board/ because it is built from them (status config,
// the kanban card, updateReleaseAction); the board itself stays entity-agnostic.

export const RELEASE_ENTITY_ID = "release";

// --- Groupings ------------------------------------------------------------------------------------

const releaseStatusGrouping: BoardGroupingDefinition<ReleaseItem> = {
	id: RELEASE_STATUS_GROUPING_ID,
	label: "Status",
	icon: <IconListDetails className="h-4 w-4" />,
	persistable: true,
	// The four columns are the release lifecycle: an empty one (often Archived) still shows, as before.
	keepEmptyColumns: true,
	group: (items, { showCompletedTasks }) =>
		bucketByValue(items, visibleReleaseStatuses(showCompletedTasks), (release) => release.status).map(
			({ id, items: bucket }) => {
				const config = releaseStatusConfig[id];
				return {
					id,
					label: config.label,
					items: bucket,
					// The status colour (config's own classes) on the glyph; `color` tints the list's group header.
					icon: <span className={config.className}>{config.icon("h-3.5 w-3.5")}</span>,
					color: config.color,
				};
			}
		),
	getDropPatch: (item, columnId, { now }) => getReleaseStatusDropPatch(item, columnId, now),
};

/** Every release in one header-less section (the list without status sections). */
const releaseNoneGrouping: BoardGroupingDefinition<ReleaseItem> = {
	id: NONE_GROUPING_ID,
	label: "None",
	icon: <IconRocket className="h-4 w-4" />,
	persistable: false,
	canSubGroup: false,
	group: (items) => [{ id: NONE_COLUMN_ID, label: "All", items: [...items] }],
};

// --- Filters --------------------------------------------------------------------------------------

const RELEASE_STATUS_OPTIONS: FilterOption[] = RELEASE_STATUS_ORDER.map((status) => ({
	value: status,
	label: releaseStatusConfig[status].label,
	color: releaseStatusConfig[status].color,
	icon: releaseStatusConfig[status].icon("w-3 h-3"),
}));

/** The org members referenced by `pick` on any release, as picker options. */
function userOptions(
	releases: readonly ReleaseItem[],
	users: readonly schema.UserSummary[],
	subSearch: string,
	pick: (release: ReleaseItem) => string | null
): FilterOption[] {
	const ids = new Set(releases.map(pick).filter((id): id is string => id !== null));
	const q = subSearch.toLowerCase();
	return users
		.filter((user) => ids.has(user.id) && (user.name ?? "").toLowerCase().includes(q))
		.map((user) => ({ value: user.id, label: user.name || "Unknown User", image: user.image || "" }));
}

const DATE_OPERATORS: FilterFieldConfig<ReleaseItem>["operators"] = [
	"before",
	"after",
	"between",
	"empty",
	"not_empty",
];

const RELEASE_FILTER_FIELDS: readonly FilterFieldConfig<ReleaseItem>[] = [
	{
		field: "status",
		label: "Status",
		icon: <IconListDetails className="w-4 h-4" />,
		operators: ["any", "none"],
		filterDefault: "any",
		multi: true,
		getOptions: (_releases, _labels, _users, subSearch) =>
			RELEASE_STATUS_OPTIONS.filter((option) => option.label.toLowerCase().includes(subSearch.toLowerCase())),
	},
	{
		field: "lead",
		label: "Lead",
		icon: <IconUserStar className="w-4 h-4" />,
		operators: ["any", "none", "empty", "not_empty"],
		filterDefault: "any",
		multi: true,
		empty: "No lead",
		getOptions: (releases, _labels, users, subSearch) =>
			userOptions(releases, users, subSearch, (release) => release.leadId),
	},
	{
		field: "creator",
		label: "Creator",
		icon: <IconUser className="w-4 h-4" />,
		operators: ["any", "none"],
		filterDefault: "any",
		multi: true,
		getOptions: (releases, _labels, users, subSearch) =>
			userOptions(releases, users, subSearch, (release) => release.createdBy),
	},
	{
		field: "target_date",
		label: "Target date",
		icon: <IconCalendar className="w-4 h-4" />,
		operators: DATE_OPERATORS,
		filterDefault: "between",
		date: true,
	},
	{
		field: "released_at",
		label: "Released",
		icon: <IconRocket className="w-4 h-4" />,
		operators: DATE_OPERATORS,
		filterDefault: "between",
		date: true,
	},
	{
		field: "created_at",
		label: "Created",
		icon: <IconCalendar className="w-4 h-4" />,
		operators: ["before", "after", "between"],
		filterDefault: "between",
		date: true,
	},
	{
		field: "title",
		label: "Name",
		icon: <IconTextSize className="w-4 h-4" />,
		operators: ["contains", "not_contains"],
		filterDefault: "contains",
	},
];

const RELEASE_SORT_FIELDS: readonly BoardSortFieldOption[] = [
	{ id: "targetDate", label: "Target date" },
	{ id: "releasedAt", label: "Released date" },
	{ id: "createdAt", label: "Created date" },
	{ id: "name", label: "Name" },
];

// --- Views / renderers ----------------------------------------------------------------------------

// The shared kanban (full height, a scrolling column per status — what /home's kanban is) and list. One
// grouping level only: sub-grouping has nothing to offer with a single real grouping.
const RELEASE_KANBAN_VIEW: BoardViewDefinition<ReleaseItem> = {
	...KANBAN_VIEW,
	supports: { ...KANBAN_VIEW.supports, subGrouping: false },
};

const RELEASE_LIST_VIEW: BoardViewDefinition<ReleaseItem> = {
	...LIST_VIEW,
	supports: { ...LIST_VIEW.supports, subGrouping: false, subtasks: "flat" },
};

function ReleaseBoardCard({ item }: BoardEntityCardProps<ReleaseItem>) {
	return <ReleasesKanbanCard release={item} orgId={item.organizationId} />;
}

/**
 * Executes a release drop: optimistic status (+ releasedAt) write through the data source's `updateItems`,
 * then `updateReleaseAction` with the toast the old releases kanban used. Like before, there is no
 * client-side permission check (the server enforces it) and a failed update isn't rolled back.
 */
function ReleaseDropExecutor({ mutation, onHandled }: BoardEntityDropExecutorProps<ReleaseItem>) {
	const { updateItems } = useBoardEntityData(RELEASE_BOARD_ENTITY);
	const { runWithToast } = useToastAction();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	// Read at drop time, not dependencies: the optimistic write re-renders the board, which must not re-run this.
	const latest = useRef({ updateItems, runWithToast, sseClientId });
	latest.current = { updateItems, runWithToast, sseClientId };

	useEffect(() => {
		const patch = resolveReleaseDrop(mutation, new Date());
		if (patch) {
			const release = mutation.item;
			const label = releaseStatusConfig[patch.status].label;
			const { updateItems: write, runWithToast: run, sseClientId: clientId } = latest.current;
			write?.((prev) => prev.map((item) => (item.id === release.id ? applyReleasePatch(item, patch) : item)));
			void run(
				`release-status-${release.id}`,
				{
					loading: { title: "Updating...", description: `Moving to ${label}.` },
					success: { title: "Status updated", description: `Release moved to ${label}.` },
					error: { title: "Failed", description: "Could not update release status." },
				},
				() => updateReleaseAction(release.organizationId, release.id, patch, clientId)
			);
		}
		onHandled();
	}, [mutation, onHandled]);

	return null;
}

export const RELEASE_BOARD_ENTITY: BoardEntity<ReleaseItem> = {
	id: RELEASE_ENTITY_ID,
	noun: { singular: "release", plural: "releases" },
	groupings: [releaseStatusGrouping, releaseNoneGrouping],
	groupingMenu: [RELEASE_STATUS_GROUPING_ID, pageLocalGrouping(NONE_GROUPING_ID)],
	filterFields: RELEASE_FILTER_FIELDS,
	// Status has its own count tiles above the quick filters.
	quickFilterFields: ["lead", "creator"],
	extractFilterValue: extractReleaseFieldValue,
	sortFields: RELEASE_SORT_FIELDS,
	sort: sortReleases,
	isCompleted: isReleaseArchived,
	completedToggleLabel: "Show archived releases",
	views: [RELEASE_KANBAN_VIEW, RELEASE_LIST_VIEW],
	Row: ReleaseBoardRow,
	Card: ReleaseBoardCard,
	DropExecutor: ReleaseDropExecutor,
};

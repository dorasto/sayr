import { IconBolt, IconCalendarOff, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { BoardColumn, BoardGroupingDefinition } from "@/components/board/config/grouping-registry";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { isUnscheduledColumnId, toBoardColumns } from "@/lib/portal/roadmap-columns";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { StatusChip } from "../ui/StatusChip";

/** Grouping id of the roadmap's "By status" columns (Planned / In progress / Done recently). */
export const ROADMAP_STATUS_GROUPING_ID = "roadmap-status";
/** Grouping id of the roadmap's "By release" columns (one per upcoming release, then Unscheduled). */
export const ROADMAP_RELEASE_GROUPING_ID = "roadmap-release";

const RELEASE_CHIP =
	"relative inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-portal-neutral-soft pr-2.5 pl-[9px] font-semibold text-[12.5px] text-portal-fg";

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
			className={`${RELEASE_CHIP} outline-none after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] md:after:hidden hover:bg-portal-raised focus-visible:ring-2 focus-visible:ring-portal-focus`}
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
export function createRoadmapGroupings(
	releasesById: ReadonlyMap<string, PublicReleaseSummary>
): BoardGroupingDefinition[] {
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

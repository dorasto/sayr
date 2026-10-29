import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { cn } from "@repo/ui/lib/utils";
import { useMemo } from "react";
import { useBoardEntityData } from "@/components/board/core/board-data";
import { formatEntityCount } from "@/components/board/core/entity";
import { areFiltersEqual, DEFAULT_FILTER_STATE } from "@/components/board/core/view-config";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { QuickFilterPanel } from "@/components/board/quick-filters/quick-filter-panel";
import { RELEASE_BOARD_ENTITY } from "@/components/releases/board/release-board-entity";
import {
	buildReleaseStatusFilter,
	countReleasesByStatus,
	RELEASE_STATUS_ORDER,
} from "@/components/releases/board/release-board-model";
import { releaseStatusConfig } from "@/components/releases/config";

/**
 * The releases page's right-panel body (the org tasks page's layout): a count tile per status on top — a
 * click filters the board to that status, a second click clears it (active while the live filters equal
 * it) — and the board's quick filters underneath (the release entity's lead/creator facets). Reads
 * everything from the board's provider and view state, so it's handed to the panel once.
 */
export function ReleasesPanelContent() {
	const { items } = useBoardEntityData(RELEASE_BOARD_ENTITY);
	const { filters, applyFilter } = useBoardViewState();
	const counts = useMemo(() => countReleasesByStatus(items), [items]);
	const statusFilters = useMemo(
		() => RELEASE_STATUS_ORDER.map((status) => ({ status, filters: buildReleaseStatusFilter(status) })),
		[]
	);

	return (
		<div className="flex flex-col gap-3 w-full relative">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
				{statusFilters.map(({ status, filters: statusFilter }) => {
					const config = releaseStatusConfig[status];
					const active = areFiltersEqual(filters, statusFilter);
					return (
						<Tile
							key={status}
							className={cn(
								"bg-card md:w-full cursor-pointer select-none",
								active ? "bg-accent" : "bg-card hover:bg-accent"
							)}
							// applyFilter (not clearView) keeps the view mode/grouping the viewer picked.
							onClick={() => applyFilter(active ? DEFAULT_FILTER_STATE : statusFilter)}
						>
							<TileHeader>
								<TileTitle className="flex items-center gap-2">
									<TileIcon
										// Muted like the org tasks page's tiles; the status colour stays on the board itself.
										className={cn(
											active ? "text-foreground bg-muted-foreground/20" : "text-muted-foreground"
										)}
									>
										{config.icon("size-3.5")}
									</TileIcon>
									{config.label}
								</TileTitle>
								<TileDescription>
									{formatEntityCount(RELEASE_BOARD_ENTITY.noun, counts[status])}
								</TileDescription>
							</TileHeader>
						</Tile>
					);
				})}
			</div>
			<QuickFilterPanel />
		</div>
	);
}

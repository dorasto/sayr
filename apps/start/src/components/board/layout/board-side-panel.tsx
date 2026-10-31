import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { getInitials } from "@repo/util";
import { IconStack2, IconUser } from "@tabler/icons-react";
import { useMemo } from "react";
import { useBoardData } from "../core/board-data";
import { QuickFilterPanel } from "../quick-filters/quick-filter-panel";
import { CountTile, TaskOverviewSections, usePresetTiles } from "./task-overview";
import { buildAssigneePresetFilters, buildOrgPresetFilters, countCrossOrgTasks } from "./task-overview-model";

/**
 * The cross-org board's right-panel body (/home): compact count tiles ("Open tasks" clears the view; "Your tasks"
 * and one tile per org on the board toggle their preset filter — active while the live filters equal it), then the
 * shared overview sections (task-overview.tsx) and the quick filters. The org tasks page's counterpart is
 * OrgTasksPanelContent. The full filter builder lives behind the Filter button in the page toolbar
 * (filter-builder.tsx's FilterBuilder), view listing/edit/delete/save-as-new all live in ActiveViewSwitcher (the
 * breadcrumb dropdown), and pin/unpin lives in active-view-panel-header.tsx's ActiveViewPanelPinButton.
 * Page-agnostic: takes no props and reads everything from board context, meant to be handed to a page's own panel
 * once via setPanelContent (see the page-component skill) — the panel id/registration itself is the page's concern,
 * not board's.
 */
export function BoardSidePanelContent() {
	const { items, viewerId } = useBoardData();
	const { isAllActive, isPresetActive, togglePreset, clearView } = usePresetTiles();
	const counts = useMemo(() => countCrossOrgTasks(items, viewerId), [items, viewerId]);
	const yourTasks = useMemo(() => (viewerId ? buildAssigneePresetFilters(viewerId) : undefined), [viewerId]);
	const orgTiles = useMemo(
		() => counts.orgs.map((org) => ({ org, filters: buildOrgPresetFilters(org.id) })),
		[counts.orgs]
	);

	return (
		<div className="relative flex w-full flex-col gap-4">
			<div className="grid grid-cols-2 gap-1.5">
				<CountTile
					active={isAllActive}
					onClick={() => clearView()}
					icon={<IconStack2 className="size-3.5" />}
					title="Open tasks"
					count={counts.open}
				/>
				{yourTasks && (
					<CountTile
						active={isPresetActive(yourTasks)}
						onClick={() => togglePreset(yourTasks)}
						icon={<IconUser className="size-3.5" />}
						title="Your tasks"
						count={counts.openAssignedToViewer}
					/>
				)}
				{orgTiles.map(({ org, filters }) => (
					<CountTile
						key={org.id}
						active={isPresetActive(filters)}
						onClick={() => togglePreset(filters)}
						icon={
							<Avatar className="size-3.5 rounded-sm shrink-0">
								<AvatarImage src={org.logo ?? undefined} alt={org.name} />
								<AvatarFallback className="rounded-sm text-[7px]">{getInitials(org.name)}</AvatarFallback>
							</Avatar>
						}
						title={org.name}
						count={org.open}
					/>
				))}
			</div>

			<TaskOverviewSections />

			<div className="mx-1.5 h-px bg-border" />
			<QuickFilterPanel />
		</div>
	);
}

import { useCallback, useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { pickLatestRelease } from "@/lib/portal/board-row";
import type { PanelHeaderConfig } from "@/lib/sidebar/sidebar-store";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { usePeekEnabled } from "../peek/usePeekEnabled";
import { PublicTaskCreator, usePublicPostAbility } from "../../public-task-creator";
import { useBoardRail } from "./board-rail-context";
import { CategoriesCard, LatestReleaseCard } from "./BoardRailCards";
import { PUBLIC_BOARD_PANEL_ID } from "./constants";

/**
 * Body of the board panel while no post is selected: the composer, "Browse by category" and "Latest release". Takes no
 * props (it reads the board's data from `useBoardRail()`, the composer's draft from the provider), so it is handed to
 * the panel store once as `RAIL_CONTENT` and stays live by itself.
 */
export function BoardRailContent() {
	const { organization, categories } = usePublicOrganizationLayout();
	const { loadedTasks, counts, releases, activeCategorySlug, onCategoryChange } = useBoardRail();
	const { canPost } = usePublicPostAbility();
	const desktop = usePeekEnabled();
	const hasLatestRelease = useMemo(() => pickLatestRelease(releases) !== null, [releases]);

	// Below 1024px the panel is a modal sheet over the list: once a category is picked, get out of the way so the
	// filtered list is visible. On desktop the panel sits beside the list and stays open.
	const handleCategorySelect = useCallback(
		(slug: string | null) => {
			onCategoryChange(slug);
			if (!desktop) sidebarActions.close(PUBLIC_BOARD_PANEL_ID);
		},
		[onCategoryChange, desktop]
	);

	const isEmpty = !canPost && categories.length === 0 && !hasLatestRelease;

	return (
		<div className="flex flex-col gap-4 p-1">
			<PublicTaskCreator tasks={loadedTasks} />
			<CategoriesCard
				categories={categories}
				counts={counts}
				activeSlug={activeCategorySlug}
				onSelect={handleCategorySelect}
			/>
			<LatestReleaseCard orgSlug={organization.slug} releases={releases} />
			{isEmpty && <p className="px-2 py-6 text-center text-[13.5px] text-portal-fg-3">Nothing to show here yet.</p>}
		</div>
	);
}

/** Stable element handed to the panel store once (it holds no props, see `BoardRailContent`). */
export const RAIL_CONTENT = <BoardRailContent />;

/** Header for the overview: the native bar with its built-in close button (which closes the whole panel). */
export const RAIL_HEADER: PanelHeaderConfig = { title: "Overview" };

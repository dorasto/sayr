import { Label } from "@repo/ui/components/label";
import { useCallback, useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { pickLatestRelease } from "@/lib/portal/board-row";
import type { PanelHeaderConfig } from "@/lib/sidebar/sidebar-store";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { usePanelDocked } from "../peek/usePeekEnabled";
import { useBoardRail } from "./BoardRailProvider";
import { CategoriesCard } from "./CategoriesCard";
import { LatestReleaseCard } from "./LatestReleaseCard";

/**
 * Id of the board's single right-hand panel. It shows the overview (categories, latest release) by default
 * and swaps to a post (Peek) while one is selected. The board registers it on its `Page`; `BoardPanelProvider` drives it.
 * (Renamed from `public-peek-panel` so a persisted open/closed value from the old, closed-by-default panel is not reused.)
 */
export const PUBLIC_BOARD_PANEL_ID = "public-board-panel";

/**
 * Body of the board panel while no post is selected: "Browse by category" and "Latest release" (the "Write a post"
 * button lives in `BoardFeedbackCard` above the posts). Takes no props (it reads the board's data
 * from `BoardRailProvider`), so it is handed to the panel store once as `RAIL_CONTENT` and stays live by itself.
 */
export function BoardRailContent() {
  const { organization, categories } = usePublicOrganizationLayout();
  const { counts, releases, activeCategorySlug, onCategoryChange } =
    useBoardRail();
  const desktop = usePanelDocked();
  const hasLatestRelease = useMemo(
    () => pickLatestRelease(releases) !== null,
    [releases],
  );

  // Below 1024px the panel is a modal sheet over the list: once a category is picked, get out of the way so the
  // filtered list is visible. On desktop the panel sits beside the list and stays open.
  const handleCategorySelect = useCallback(
    (slug: string | null) => {
      onCategoryChange(slug);
      if (!desktop) sidebarActions.close(PUBLIC_BOARD_PANEL_ID);
    },
    [onCategoryChange, desktop],
  );

  const isEmpty = categories.length === 0 && !hasLatestRelease;

  return (
    <div className="flex flex-col gap-3">
      <CategoriesCard
        categories={categories}
        counts={counts}
        activeSlug={activeCategorySlug}
        onSelect={handleCategorySelect}
      />
      <LatestReleaseCard orgSlug={organization.slug} releases={releases} />
      {isEmpty && (
        <Label variant="description" className="block py-6 text-center">
          Nothing to show here yet.
        </Label>
      )}
    </div>
  );
}

/** Stable element handed to the panel store once (it holds no props, see `BoardRailContent`). */
export const RAIL_CONTENT = <BoardRailContent />;

/** Header for the overview: the native bar with its built-in close button (which closes the whole panel). */
export const RAIL_HEADER: PanelHeaderConfig = {
  title: "Overview",
  showClose: false,
};

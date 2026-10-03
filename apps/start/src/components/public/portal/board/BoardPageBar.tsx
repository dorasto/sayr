import { Button } from "@repo/ui/components/button";
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { usePage, usePanel } from "@/components/generic/use-page";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PUBLIC_BOARD_PANEL_ID } from "./BoardRailContent";

/**
 * The board's top bar (the Page `header`, h-11 on desktop, h-14 on phones): just the toggle that hides and shows the
 * right-hand panel. The toggle is how a closed panel comes back, and how the panel is opened below 1024px, where it
 * never opens by itself. Tabs, sort and filters live in `BoardFeedbackCard` above the posts.
 */
export function BoardPageBar() {
  const panel = usePanel(PUBLIC_BOARD_PANEL_ID);
  const { closePanel } = usePage();

  return (
    <div className="flex h-11 shrink-0 items-center justify-end px-3 md:h-11 sticky top-0 z-50">
      <Button
        type="button"
        variant={panel.isOpen ? "secondary" : "ghost"}
        size="sm"
        aria-label={panel.isOpen ? "Hide panel" : "Show panel"}
        aria-pressed={panel.isOpen}
        className="h-6 w-6 shrink-0 gap-2 p-1"
        onClick={() =>
          panel.isOpen
            ? closePanel(PUBLIC_BOARD_PANEL_ID)
            : sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true)
        }
      >
        {panel.isOpen ? (
          <IconLayoutSidebarRightFilled />
        ) : (
          <IconLayoutSidebarRight />
        )}
      </Button>
    </div>
  );
}

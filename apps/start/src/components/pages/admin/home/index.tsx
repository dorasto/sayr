import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  IconHome,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { Board } from "@/components/board/board";
import { FilterBuilder } from "@/components/board/filter/filter-builder";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { BoardSidePanelContent } from "@/components/board/layout/board-side-panel";
import { BoardViewOptions } from "@/components/board/layout/board-view-options";
import { TaskCountLabel } from "@/components/board/layout/task-count-label";
import {
  ActiveViewPanelHeader,
  ActiveViewPanelPinButton,
} from "@/components/board/saved-views/active-view-panel-header";
import { ActiveViewSwitcher } from "@/components/board/saved-views/active-view-switcher";
import { PageHeader } from "@/components/generic/PageHeader";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { useLanderData } from "@/contexts/ContextLander";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import type { PendingInviteWithOrg } from "@/routes/(admin)/home/index";
import { PendingInvitesSection } from "./pending-invites";

// Exported so useLanderCommands.tsx (the Cmd+K registrar for /home) can
// drive this same panel from a command action without duplicating the id.
export const LANDER_PANEL_ID = "lander-side-panel";

/**
 * The new unified cross-org lander (SAY-73 Phase 1). Uses the shared Page +
 * side-panel system (see the page-component skill) rather than a hand-rolled
 * flex split — same as every other admin page with a panel. The panel and
 * BoardTopBar both swap between showing the personal-view switcher and the
 * filter builder, driven by the landerLayout preference (user-preferences-store.ts);
 * whichever isn't in the top bar renders inline in the panel instead.
 */
export default function AdminHomePage({
  pendingInvites,
}: {
  pendingInvites: PendingInviteWithOrg[];
}) {
  const { viewMode, clearView } = useBoardViewState();
  const { tasks } = useLanderData();
  const { setPanelContent, closePanel } = usePage();
  const panel = usePanel(LANDER_PANEL_ID);

  // BoardSidePanelContent pulls everything it needs from context/the
  // preference store itself, so it only needs to be handed to the panel
  // once — it stays in sync on its own. Gated on isRegistered, not just
  // mount: Page defers registering the panel to its client-only pass, so a
  // plain `[]`-effect here would race it and silently no-op.
  useEffect(() => {
    if (!panel.isRegistered) return;
    setPanelContent(LANDER_PANEL_ID, <BoardSidePanelContent />);
  }, [panel.isRegistered, setPanelContent]);

  const header = (
    <>
      <PageHeader.Identity
        actions={
          <>
            <Button
              type="button"
              onClick={() =>
                panel.isOpen
                  ? closePanel(LANDER_PANEL_ID)
                  : sidebarActions.setOpen(LANDER_PANEL_ID, true)
              }
              title={panel.isOpen ? "Close side panel" : "Open side panel"}
              variant="accent"
              size={"sm"}
              className={cn(
                "gap-2 h-6 w-6 bg-accent border-transparent p-1",
                !panel.isOpen && "bg-transparent",
              )}
            >
              {panel.isOpen ? (
                <IconLayoutSidebarRightFilled className="size-4" />
              ) : (
                <IconLayoutSidebarRight className="size-4" />
              )}
            </Button>
          </>
        }
      >
        <Button
          type="button"
          variant="primary"
          className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
          size="sm"
          onClick={() => clearView()}
        >
          <IconHome className="size-4" />
          <span>Home</span>
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <ActiveViewSwitcher />
      </PageHeader.Identity>
      <PageHeader.Toolbar
        className="border-b-0"
        left={<TaskCountLabel />}
        right={
          <>
            <FilterBuilder />
            <BoardViewOptions />
          </>
        }
      />
    </>
  );

  return (
    <Page
      header={header}
      panels={{
        right: {
          id: LANDER_PANEL_ID,
          header: {
            icon: <ActiveViewPanelHeader />,
            actions: <ActiveViewPanelPinButton />,
            showClose: false,
          },
          defaultOpen: true,
          persistOpenState: false,
          width: "320px",
        },
      }}
      className="h-full"
    >
      <div className="h-full flex flex-col">
        <PendingInvitesSection invites={pendingInvites} />
        <div
          className={cn(
            "flex-1 min-h-0 overflow-auto px-2 pb-4 w-full",
            viewMode == "kanban" && "p-0 pl-2 rounded-xl",
          )}
        >
          <Board tasks={tasks} />
        </div>
      </div>
    </Page>
  );
}

import { cn } from "@repo/ui/lib/utils";
import {
  IconHome,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { Board } from "@/components/board/board";
import { BoardSidePanelContent } from "@/components/board/layout/board-side-panel";
import { BoardTopBar } from "@/components/board/layout/board-top-bar";
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
        icon={<IconHome className="size-4" />}
        title="Home"
        actions={
          <button
            type="button"
            onClick={() =>
              panel.isOpen
                ? closePanel(LANDER_PANEL_ID)
                : sidebarActions.setOpen(LANDER_PANEL_ID, true)
            }
            title={panel.isOpen ? "Close side panel" : "Open side panel"}
            className={cn(
              "flex items-center justify-center size-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              panel.isOpen && "bg-accent text-foreground",
            )}
          >
            {panel.isOpen ? (
              <IconLayoutSidebarRightFilled className="size-4" />
            ) : (
              <IconLayoutSidebarRight className="size-4" />
            )}
          </button>
        }
      />
      <PageHeader.Toolbar className="border-b-0" left={<BoardTopBar />} />
    </>
  );

  return (
    <Page
      header={header}
      panels={{
        right: {
          id: LANDER_PANEL_ID,
          header: { title: "Views & filters" },
          defaultOpen: false,
          width: "320px",
        },
      }}
      className="h-full"
    >
      <div className="h-full flex flex-col">
        <PendingInvitesSection invites={pendingInvites} />
        <div className="flex-1 min-h-0 overflow-auto px-2 pb-4 max-w-6xl mx-auto w-full">
          <Board tasks={tasks} />
        </div>
      </div>
    </Page>
  );
}

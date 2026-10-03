import { Button, buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import {
  IconArrowLeft,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePage, usePanel } from "@/components/generic/use-page";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";

interface PostPageBarProps {
  orgSlug: string;
  /** Id of the post page's Details drawer, toggled by the right-hand button. */
  panelId: string;
}

/** Top bar of a public post page: back to Feedback on the left, the Details drawer toggle on the right. */
export function PostPageBar({ orgSlug, panelId }: PostPageBarProps) {
  const panel = usePanel(panelId);
  const { closePanel } = usePage();

  return (
    <div className="flex h-14 shrink-0 items-center justify-between bg-background px-2 md:h-11 md:px-3 ">
      <Link
        to="/orgs/$orgSlug"
        params={{ orgSlug }}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-6 gap-2 px-2",
        )}
      >
        <IconArrowLeft aria-hidden className="size-4" />
        Feedback
      </Link>
      <Button
        type="button"
        variant={panel.isOpen ? "secondary" : "ghost"}
        size="sm"
        aria-label={panel.isOpen ? "Hide details" : "Show details"}
        aria-pressed={panel.isOpen}
        className="h-6 w-6 gap-2 p-1"
        onClick={() =>
          panel.isOpen
            ? closePanel(panelId)
            : sidebarActions.setOpen(panelId, true)
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

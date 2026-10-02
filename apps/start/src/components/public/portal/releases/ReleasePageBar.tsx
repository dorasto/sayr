import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowLeft, IconLayoutSidebarRight, IconLayoutSidebarRightFilled } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePage, usePanel } from "@/components/generic/use-page";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";

interface ReleasePageBarProps {
	orgSlug: string;
	/** Id of the release details drawer this bar toggles. */
	panelId: string;
}

/** Release page header bar: "Changelog" back link and the details-drawer toggle. */
export function ReleasePageBar({ orgSlug, panelId }: ReleasePageBarProps) {
	const panel = usePanel(panelId);
	const { closePanel } = usePage();

	return (
		<div className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-2 md:h-11 md:px-3">
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className="inline-flex h-8 items-center gap-2 rounded-md px-2 font-medium text-[13.5px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground max-md:h-11 max-md:text-base"
			>
				<IconArrowLeft aria-hidden className="size-4" />
				Changelog
			</Link>
			<Button
				variant="ghost"
				size="icon"
				aria-label={panel.isOpen ? "Hide progress and details" : "Show progress and details"}
				aria-pressed={panel.isOpen}
				className={cn("size-[30px] max-md:size-11", panel.isOpen && "bg-muted text-foreground")}
				onClick={() => (panel.isOpen ? closePanel(panelId) : sidebarActions.setOpen(panelId, true))}
			>
				{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
			</Button>
		</div>
	);
}

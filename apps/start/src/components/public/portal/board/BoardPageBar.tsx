import { cn } from "@repo/ui/lib/utils";
import { IconLayoutSidebarRight, IconLayoutSidebarRightFilled } from "@tabler/icons-react";
import { usePage, usePanel } from "@/components/generic/use-page";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PortalButton } from "../ui/PortalButton";
import { BoardTabs, BoardToolbarControls, type BoardToolbarProps } from "./BoardToolbar";
import { PUBLIC_BOARD_PANEL_ID } from "./constants";

/**
 * The board's top bar (the Page `header`, h-11 on desktop, h-14 on phones): the tabs on the left, so the bar's own
 * bottom border is their underline track, then the sort and filter menus and the toggle that hides and shows the
 * right-hand panel. The toggle is how a closed panel comes back, and how the panel is opened below 1024px, where it
 * never opens by itself. Everything is driven by `toolbar` (built fresh by the page on every render, so tab, sort,
 * filter and count changes always reach the bar).
 */
export function BoardPageBar({ toolbar }: { toolbar: BoardToolbarProps }) {
	const panel = usePanel(PUBLIC_BOARD_PANEL_ID);
	const { closePanel } = usePage();

	return (
		<div className="flex h-14 shrink-0 items-center gap-2 border-portal-line border-b bg-portal-canvas px-3 md:h-11">
			<BoardTabs {...toolbar} />
			<div className="flex shrink-0 items-center gap-1.5 md:gap-2">
				<BoardToolbarControls {...toolbar} />
				<PortalButton
					variant="ghost"
					size="sm"
					aria-label={panel.isOpen ? "Hide panel" : "Show panel"}
					aria-pressed={panel.isOpen}
					className={cn("w-[30px] shrink-0 px-0 max-md:w-11", panel.isOpen && "bg-portal-raised text-portal-fg")}
					onClick={() =>
						panel.isOpen ? closePanel(PUBLIC_BOARD_PANEL_ID) : sidebarActions.setOpen(PUBLIC_BOARD_PANEL_ID, true)
					}
				>
					{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
				</PortalButton>
			</div>
		</div>
	);
}

import { cn } from "@repo/ui/lib/utils";
import { IconLayoutSidebarRight, IconLayoutSidebarRightFilled } from "@tabler/icons-react";
import { usePage, usePanel } from "@/components/generic/use-page";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { PortalButton } from "../ui/PortalButton";
import { PUBLIC_BOARD_PANEL_ID } from "./constants";

/**
 * The board's top bar (the same h-11 zone the post page uses): the org name on the left, the toggle that hides and
 * shows the right-hand panel on the right. The toggle is how a closed panel comes back, and how the panel is opened
 * below 1024px, where it never opens by itself.
 */
export function BoardPageBar() {
	const { organization } = usePublicOrganizationLayout();
	const panel = usePanel(PUBLIC_BOARD_PANEL_ID);
	const { closePanel } = usePage();

	return (
		<div className="flex h-14 shrink-0 items-center justify-between border-portal-line border-b bg-portal-canvas px-2 md:h-11 md:px-3">
			<span className="truncate px-2 font-medium text-[13.5px] text-portal-fg-2 max-md:text-base">
				{organization.name}
			</span>
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
	);
}

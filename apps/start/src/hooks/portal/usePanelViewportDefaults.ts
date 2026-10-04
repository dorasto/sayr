import { useEffect, useRef } from "react";
import { usePanel } from "@/components/generic/use-page";
import { usePanelDocked } from "@/components/public/portal/peek/usePeekEnabled";
import { PANEL_DESKTOP_QUERY } from "@/lib/portal/peek";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";

/**
 * Viewport behaviour for the default-open side drawers (the post and release "details" drawers, the board's panel). At
 * >= 1024px they are the usual non-modal drawer that pushes the page content and opens by default. Below that (tablet
 * and phone) they are modal, and a drawer that was left open (the default, or persisted from a wider visit) is closed
 * once on load, so the page is not covered by a backdrop on arrival; the page's toggle opens it on demand. Phones
 * already get this from `Page` itself.
 *
 * Returns the `modal` value for the panel config: `undefined` (let `Page` decide) on wide screens, `true` below.
 */
export function usePanelViewportDefaults(panelId: string): { modal: boolean | undefined } {
	const wide = usePanelDocked();
	const panel = usePanel(panelId);
	const settled = useRef(false);

	useEffect(() => {
		if (!panel.isRegistered || settled.current) return;
		settled.current = true;
		// Read the media query directly: the hook value can still be its server snapshot on the first client pass.
		if (!window.matchMedia(PANEL_DESKTOP_QUERY).matches && panel.isOpen) sidebarActions.setOpen(panelId, false);
	}, [panel.isRegistered, panel.isOpen, panelId]);

	return { modal: wide ? undefined : true };
}

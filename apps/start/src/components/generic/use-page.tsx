import { PopoverContent, Popover as PopoverPrimitive } from "@repo/ui/components/popover";
import { useStore } from "@tanstack/react-store";
import { useCallback, useRef } from "react";
import { PanelContent } from "@/components/generic/page";
import type { PanelHeaderConfig, PanelTabConfig } from "@/lib/sidebar/sidebar-store";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";

export interface PanelOptions {
	header?: PanelHeaderConfig;
	defaultTab?: string;
	tabs?: PanelTabConfig[];
}

export function usePage() {
	const openPanel = useCallback((panelId: string, content?: React.ReactNode, options?: PanelOptions) => {
		sidebarActions.setOpen(panelId, true);
		if (content) sidebarActions.setPanelContent(panelId, content);
		// Only write a header when one is actually given — storing `{}` reads
		// as truthy in PanelContent's `header ? ... : fallbackHeader` check,
		// which silently blanks out the route-configured fallback header.
		if (options?.header) sidebarActions.setPanelHeader(panelId, options.header);
		if (options?.defaultTab) sidebarActions.setActiveTab(panelId, options.defaultTab);
		if (options?.tabs) sidebarActions.setTabs(panelId, options.tabs);
	}, []);

	// Animated close, not a plain state flip — see sidebarActions.close.
	const closePanel = useCallback((panelId: string) => {
		sidebarActions.close(panelId);
	}, []);

	// Same trigger while open -> closes. Different trigger while open ->
	// swaps content instantly (stays open, no close/reopen flash). Each
	// panel slot has its own independent drawer, so opening one panel never
	// needs to force-close another.
	const togglePanel = useCallback(
		(panelId: string, content?: React.ReactNode, triggerId?: string, options?: PanelOptions) => {
			const sidebar = sidebarStore.state.sidebars[panelId];
			const isOpen = sidebar?.open ?? false;
			const isSameTrigger = sidebar?.lastTriggerId === triggerId;

			if (sidebar && isOpen && isSameTrigger) {
				sidebarActions.close(panelId);
				return;
			}

			sidebarActions.setOpen(panelId, true);
			if (content) sidebarActions.setPanelContent(panelId, content, triggerId);
			else if (triggerId) sidebarActions.setLastTriggerId(panelId, triggerId);
			// See openPanel above — don't overwrite fallbackHeader with `{}`.
			if (options?.header) sidebarActions.setPanelHeader(panelId, options.header);
			if (options?.defaultTab) sidebarActions.setActiveTab(panelId, options.defaultTab);
			if (options?.tabs) sidebarActions.setTabs(panelId, options.tabs);
		},
		[]
	);

	const setPanelContent = useCallback((panelId: string, content: React.ReactNode, triggerId?: string) => {
		sidebarActions.setPanelContent(panelId, content, triggerId);
	}, []);

	const setPanelHeader = useCallback((panelId: string, header: PanelHeaderConfig) => {
		sidebarActions.setPanelHeader(panelId, header);
	}, []);

	const setActiveTab = useCallback((panelId: string, tabId: string) => {
		sidebarActions.setActiveTab(panelId, tabId);
	}, []);

	return { openPanel, closePanel, togglePanel, setPanelContent, setPanelHeader, setActiveTab };
}

export function usePanel(panelId: string) {
	return useStore(
		sidebarStore,
		useCallback(
			(state: { sidebars: Record<string, any> }) => {
				const sidebar = state.sidebars[panelId];
				return {
					// `Page` defers actually registering a panel until its
					// client-only mount pass (SSR-safe, since open state comes
					// from localStorage the server can't see) — a mount effect
					// that wants to preload content before the user ever opens
					// the panel needs to wait for this to flip true, or its
					// setPanelContent call races registration and silently
					// no-ops (confirmed live: panel rendered with a header but
					// an empty body). Keying such an effect on `isRegistered`
					// instead of running once on `[]` deps fixes it.
					isRegistered: sidebar !== undefined,
					isOpen: sidebar?.open ?? false,
					content: sidebar?.content,
					header: sidebar?.header as PanelHeaderConfig | undefined,
					anchored: sidebar?.anchored as boolean | undefined,
					width: sidebar?.width as string | undefined,
					lastTriggerId: sidebar?.lastTriggerId,
					activeTab: sidebar?.activeTab as string | undefined,
					tabs: sidebar?.tabs as PanelTabConfig[] | undefined,
				};
			},
			[panelId]
		)
	);
}

/**
 * For items that open an "anchored" panel — a small popover pinned to the
 * trigger element, for row-level quick actions where a full side drawer
 * would be the wrong shape. Set `anchored: true` on that panel's config.
 *
 * `panelPopover` is a VALUE (already-rendered JSX), not a component —
 * deliberately NOT `() => JSX` wrapped in useCallback. A callback whose
 * deps include `isActive` gets a brand-new function identity the instant
 * the trigger opens it, and `<PanelPopover />` referencing a new
 * component type each render forces React to unmount the previous
 * instance and mount a fresh one already in `open=true` state — which
 * skips the open *transition* the Popover's positioning logic relies on
 * to calculate placement. Render this as `{panelPopover}`, never
 * `<PanelPopover />`.
 */
export function usePanelTrigger(panelId: string, triggerId: string) {
	const { closePanel } = usePage();
	const panel = usePanel(panelId);
	const triggerRef = useRef<HTMLElement | null>(null);

	const isActive = panel.isOpen && panel.lastTriggerId === triggerId;
	const isAnchored = !!panel.anchored;

	const panelPopover = isAnchored ? (
		<PopoverPrimitive
			open={isActive}
			onOpenChange={(open, eventDetails) => {
				if (open) return;
				// Same trigger toggles the panel closed itself (see togglePanel
				// above) — don't let an outside-press on the trigger element
				// ALSO close it here, or the two handlers race and it flickers.
				if (eventDetails.reason === "outside-press") {
					const target = eventDetails.event.target as Element | null;
					if (target?.closest(`[data-panel-trigger="${panelId}"]`)) {
						eventDetails.cancel();
						return;
					}
				}
				closePanel(panelId);
			}}
		>
			{/* Base UI's Positioner takes a real anchor (element, ref, or
			    virtual element) directly — no separate Anchor part needed.
			    `triggerRef` starts null before the trigger mounts, same as
			    any DOM ref. */}
			<PopoverContent
				anchor={triggerRef}
				align="start"
				sideOffset={8}
				style={panel.width ? { width: panel.width } : undefined}
				className="max-h-96 w-96 overflow-auto p-0!"
				initialFocus={false}
			>
				<PanelContent panelId={panelId} isPopover />
			</PopoverContent>
		</PopoverPrimitive>
	) : null;

	return {
		isActive,
		triggerRef,
		triggerProps: isAnchored ? ({ "data-panel-trigger": panelId } as Record<string, unknown>) : {},
		panelPopover,
	};
}

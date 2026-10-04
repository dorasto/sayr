import { useSyncExternalStore } from "react";
import { PANEL_DESKTOP_QUERY, PEEK_DESKTOP_QUERY } from "@/lib/portal/peek";

/** Reactive `matchMedia(query).matches`; `false` on the server (and the hydration pass). */
function useMediaMatch(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const media = window.matchMedia(query);
			media.addEventListener("change", onChange);
			return () => media.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
		() => false
	);
}

/** Whether the viewport is wide enough to open posts in the panel (Peek, >= 1280px). */
export function usePeekEnabled(): boolean {
	return useMediaMatch(PEEK_DESKTOP_QUERY);
}

/** Whether side panels dock beside the page (>= 1024px) rather than opening as a modal sheet. */
export function usePanelDocked(): boolean {
	return useMediaMatch(PANEL_DESKTOP_QUERY);
}

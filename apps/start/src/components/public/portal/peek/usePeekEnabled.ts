import { useSyncExternalStore } from "react";
import { PEEK_DESKTOP_QUERY } from "@/lib/portal/peek";

function subscribe(onChange: () => void) {
	const query = window.matchMedia(PEEK_DESKTOP_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(PEEK_DESKTOP_QUERY).matches;
// Server (and the hydration pass) never opens Peek.
const getServerSnapshot = () => false;

/** Whether the viewport is wide enough for Peek (>= 1024px). Reactive; `false` on the server. */
export function usePeekEnabled(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

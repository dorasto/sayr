import { Store } from "@tanstack/react-store";

interface ViewSettingsState {
	/** The saved view the sheet shows. Kept after closing until the close animation ends. */
	viewId: string | null;
	open: boolean;
}

/**
 * Which saved view the page's `ViewSettingsSheet` is showing. A store rather than a context so the
 * openers (the switcher row's pencil, the panel header's gear — the latter portalled into the side panel)
 * need no provider: each page mounts one `ViewSettingsSheet` inside its board provider and anything can open it.
 */
export const viewSettingsStore = new Store<ViewSettingsState>({ viewId: null, open: false });

export const viewSettingsActions = {
	open: (viewId: string) => viewSettingsStore.setState(() => ({ viewId, open: true })),
	close: () => viewSettingsStore.setState((state) => ({ ...state, open: false })),
	/** After the close animation: forget the view so its form unmounts. */
	reset: () => viewSettingsStore.setState(() => ({ viewId: null, open: false })),
};

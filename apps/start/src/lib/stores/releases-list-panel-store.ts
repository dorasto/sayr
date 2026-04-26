import { Store } from "@tanstack/react-store";

export interface ReleasesListPanelState {
	isOpen: boolean;
}

const STORAGE_KEY = "releases-list-panel-state";

function loadPersistedState(): ReleasesListPanelState {
	if (typeof window === "undefined") {
		return { isOpen: true };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error("Failed to load releases list panel state:", error);
	}

	return { isOpen: true };
}

function persistState(state: ReleasesListPanelState) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Failed to save releases list panel state:", error);
	}
}

export const releasesListPanelStore = new Store<ReleasesListPanelState>(loadPersistedState());

releasesListPanelStore.subscribe(() => {
	persistState(releasesListPanelStore.state);
});

export const releasesListPanelActions = {
	toggle: () => {
		releasesListPanelStore.setState((state) => ({
			isOpen: !state.isOpen,
		}));
	},
	open: () => {
		releasesListPanelStore.setState({ isOpen: true });
	},
	close: () => {
		releasesListPanelStore.setState({ isOpen: false });
	},
};

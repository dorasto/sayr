import { Store } from "@tanstack/react-store";

export interface ReleaseChartsState {
	isOpen: boolean;
}

const STORAGE_KEY = "release-charts-panel-state";

// Load initial state from localStorage
function loadPersistedState(): ReleaseChartsState {
	if (typeof window === "undefined") {
		return { isOpen: true };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error("Failed to load release charts panel state:", error);
	}

	return { isOpen: true };
}

// Save state to localStorage
function persistState(state: ReleaseChartsState) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Failed to save release charts panel state:", error);
	}
}

export const releaseChartsStore = new Store<ReleaseChartsState>(loadPersistedState());

// Subscribe to store changes and persist to localStorage
releaseChartsStore.subscribe(() => {
	persistState(releaseChartsStore.state);
});

export const releaseChartsActions = {
	toggle: () => {
		releaseChartsStore.setState((state) => ({
			isOpen: !state.isOpen,
		}));
	},
	open: () => {
		releaseChartsStore.setState({ isOpen: true });
	},
	close: () => {
		releaseChartsStore.setState({ isOpen: false });
	},
};

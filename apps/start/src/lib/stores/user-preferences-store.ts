import { Store } from "@tanstack/react-store";

export type TaskOpenMode = "page" | "dialog";

/**
 * Which of the lander's two swappable toolbar components (the personal-view
 * switcher and the filter builder) lives in the top bar vs a side panel —
 * "presetTop" = switcher in the top bar, filter builder in the panel;
 * "presetSide" = the reverse. See board/layout/{board-top-bar,board-side-panel}.tsx.
 */
export type LanderLayout = "presetTop" | "presetSide";

export interface UserPreferencesState {
	taskOpenMode: TaskOpenMode;
	landerLayout: LanderLayout;
}

const STORAGE_KEY = "user-preferences";

const DEFAULT_STATE: UserPreferencesState = {
	taskOpenMode: "page",
	landerLayout: "presetTop",
};

function loadPersistedState(): UserPreferencesState {
	if (typeof window === "undefined") return DEFAULT_STATE;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...DEFAULT_STATE, ...parsed };
		}
	} catch (error) {
		console.error("Failed to load user preferences from localStorage:", error);
	}

	return DEFAULT_STATE;
}

function persistState(state: UserPreferencesState) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Failed to save user preferences to localStorage:", error);
	}
}

export const userPreferencesStore = new Store<UserPreferencesState>(loadPersistedState());

userPreferencesStore.subscribe(() => {
	persistState(userPreferencesStore.state);
});

export const userPreferencesActions = {
	setTaskOpenMode: (mode: TaskOpenMode) => {
		userPreferencesStore.setState((state) => ({
			...state,
			taskOpenMode: mode,
		}));
	},
	setLanderLayout: (layout: LanderLayout) => {
		userPreferencesStore.setState((state) => ({
			...state,
			landerLayout: layout,
		}));
	},
};

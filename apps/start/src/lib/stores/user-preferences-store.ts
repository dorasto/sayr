import { Store } from "@tanstack/react-store";

export type TaskOpenMode = "page" | "dialog";

export interface UserPreferencesState {
	taskOpenMode: TaskOpenMode;
}

const STORAGE_KEY = "user-preferences";

const DEFAULT_STATE: UserPreferencesState = {
	taskOpenMode: "page",
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
};

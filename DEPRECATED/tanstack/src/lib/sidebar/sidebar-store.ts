import { Store } from "@tanstack/react-store";

export interface SidebarState {
	open: boolean;
	openMobile: boolean;
	variant: "default" | "floating" | "inset";
	side: "left" | "right";
	keyboardShortcut?: string;
	activeItem?: string;
}

export interface SidebarStoreState {
	sidebars: Record<string, SidebarState>;
	keyboardShortcuts: Record<string, string>; // Map of shortcut -> sidebarId
}

const STORAGE_KEY = "sidebar-state";

// Load initial state from localStorage
function loadPersistedState(): SidebarStoreState {
	if (typeof window === "undefined") {
		return { sidebars: {}, keyboardShortcuts: {} };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Ensure keyboardShortcuts exists for backward compatibility
			return {
				sidebars: parsed.sidebars || {},
				keyboardShortcuts: parsed.keyboardShortcuts || {},
			};
		}
	} catch (error) {
		console.error("Failed to load sidebar state from localStorage:", error);
	}

	return { sidebars: {}, keyboardShortcuts: {} };
}

// Save state to localStorage
function persistState(state: SidebarStoreState) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error("Failed to save sidebar state to localStorage:", error);
	}
}

export const sidebarStore = new Store<SidebarStoreState>(loadPersistedState());

// Subscribe to store changes and persist to localStorage
sidebarStore.subscribe(() => {
	persistState(sidebarStore.state);
});

export const sidebarActions = {
	registerSidebar: (id: string, initialState: Partial<SidebarState> = {}) => {
		sidebarStore.setState((state: SidebarStoreState) => {
			const newState: SidebarState = {
				open: true,
				openMobile: false,
				variant: "default",
				side: "left",
				...initialState,
			};

			// Update keyboard shortcuts mapping if a shortcut is provided
			const newKeyboardShortcuts = { ...state.keyboardShortcuts };
			if (newState.keyboardShortcut) {
				newKeyboardShortcuts[newState.keyboardShortcut] = id;
			}

			return {
				sidebars: {
					...state.sidebars,
					[id]: newState,
				},
				keyboardShortcuts: newKeyboardShortcuts,
			};
		});
	},

	unregisterSidebar: (id: string) => {
		sidebarStore.setState((state: SidebarStoreState) => {
			const { [id]: removedSidebar, ...rest } = state.sidebars;

			// Remove keyboard shortcut mapping if exists
			const newKeyboardShortcuts = { ...state.keyboardShortcuts };
			if (removedSidebar?.keyboardShortcut) {
				delete newKeyboardShortcuts[removedSidebar.keyboardShortcut];
			}

			return {
				sidebars: rest,
				keyboardShortcuts: newKeyboardShortcuts,
			};
		});
	},

	toggleSidebar: (id: string, open?: boolean) => {
		sidebarStore.setState((state: SidebarStoreState) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				...state,
				sidebars: {
					...state.sidebars,
					[id]: {
						...sidebar,
						open: open ?? !sidebar.open,
					},
				},
			};
		});
	},

	setOpen: (id: string, open: boolean, mobile: boolean = false) => {
		sidebarStore.setState((state: SidebarStoreState) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				...state,
				sidebars: {
					...state.sidebars,
					[id]: {
						...sidebar,
						open: mobile ? sidebar.open : open,
						openMobile: mobile ? open : sidebar.openMobile,
					},
				},
			};
		});
	},
};

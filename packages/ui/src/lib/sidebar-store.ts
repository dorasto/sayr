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
	registerSidebar: (
		id: string,
		initialState: Partial<SidebarState> = {},
	) => {
		sidebarStore.setState((state) => {
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
		sidebarStore.setState((state) => {
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

	toggleSidebar: (id: string, isMobile = false) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				sidebars: {
					...state.sidebars,
					[id]: {
						...sidebar,
						...(isMobile
							? { openMobile: !sidebar.openMobile }
							: { open: !sidebar.open }),
					},
				},
				keyboardShortcuts: state.keyboardShortcuts,
			};
		});
	},

	setOpen: (id: string, open: boolean, isMobile = false) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				sidebars: {
					...state.sidebars,
					[id]: {
						...sidebar,
						...(isMobile ? { openMobile: open } : { open }),
					},
				},
				keyboardShortcuts: state.keyboardShortcuts,
			};
		});
	},

	setVariant: (id: string, variant: SidebarState["variant"]) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, variant },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			};
		});
	},

	setKeyboardShortcut: (id: string, shortcut: string | undefined) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			// Remove old shortcut mapping if exists
			const newKeyboardShortcuts = { ...state.keyboardShortcuts };
			if (sidebar.keyboardShortcut) {
				delete newKeyboardShortcuts[sidebar.keyboardShortcut];
			}

			// Add new shortcut mapping if provided
			if (shortcut) {
				newKeyboardShortcuts[shortcut] = id;
			}

			return {
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, keyboardShortcut: shortcut },
				},
				keyboardShortcuts: newKeyboardShortcuts,
			};
		});
	},

	setActiveItem: (id: string, item: string) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return {
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, activeItem: item },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			};
		});
	},

	// Toggle sidebar by keyboard shortcut
	toggleByShortcut: (shortcut: string, isMobile = false) => {
		const sidebarId = sidebarStore.state.keyboardShortcuts[shortcut];
		if (sidebarId) {
			sidebarActions.toggleSidebar(sidebarId, isMobile);
		}
	},

	// Clear all persisted sidebar state
	clearPersistedState: () => {
		if (typeof window === "undefined") return;
		try {
			localStorage.removeItem(STORAGE_KEY);
			sidebarStore.setState({ sidebars: {}, keyboardShortcuts: {} });
		} catch (error) {
			console.error("Failed to clear sidebar state:", error);
		}
	},

	// Clear persisted state for a specific sidebar
	clearSidebarState: (id: string) => {
		sidebarStore.setState((state) => {
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
};

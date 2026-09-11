import { Store } from "@tanstack/react-store";

export type SidebarSide = "left" | "right" | "top" | "bottom";
export type SidebarVariant = "default" | "floating" | "inset" | "panel";

export interface PanelHeaderConfig {
	title?: string;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	showClose?: boolean;
}

export interface PanelTabConfig {
	id: string;
	label: string;
	icon?: React.ReactNode;
	content: React.ReactNode;
}

export interface SidebarState {
	open: boolean;
	// Kept alongside `open` (not folded into it) specifically for a nav
	// sidebar's desktop-collapsed-rail vs. mobile-sheet-open — those are
	// genuinely independent states there. Panels never need them
	// independent — sidebarActions.setOpen (used by everything
	// panel-related) always writes both together, so a panel's `open` and
	// `openMobile` can't drift apart.
	openMobile: boolean;
	variant: SidebarVariant;
	side: SidebarSide;
	keyboardShortcut?: string;
	activeItem?: string;
	isPanel?: boolean;

	// Anchored (popover) panels render entirely outside the layout, via a
	// Popover anchored to the trigger element — used for small, row-level
	// quick actions (a table row's settings gear) where a full side drawer
	// would be the wrong shape. Every other panel renders through the
	// shared IndentDrawer/float system.
	anchored?: boolean;

	// Drawer/popover surface sizing — same fields, same meaning, on every
	// breakpoint. `width` also doubles as an anchored panel's popover width.
	// This is pure app config (see syncPanelConfig's doc comment) — the
	// route's own default, resynced on every mount.
	width?: string;
	height?: string;
	mobileZoom?: number;

	// User-driven, sticky (like `open`) — set by dragging a panel's resize
	// handle. In px, always overrides `width` when present. Deliberately
	// separate from `width` instead of overwriting it: syncPanelConfig
	// resyncs `width` from the route's config on every mount, and a resized
	// panel must survive that resync instead of snapping back to the
	// route's default the next time the page loads.
	resizedWidth?: number;

	activeTab?: string;
	tabs?: PanelTabConfig[];

	// Dynamic content tracking — NOT stored in localStorage
	content?: React.ReactNode;
	lastTriggerId?: string;
	header?: PanelHeaderConfig;
}

export interface SidebarStoreState {
	sidebars: Record<string, SidebarState>;
	keyboardShortcuts: Record<string, string>; // Map of shortcut -> sidebarId
}

const STORAGE_KEY = "sidebar-state";

// Module-level registry of imperative drawer handles, keyed by panel id —
// populated by whatever is currently rendering a panel through the
// IndentDrawer/float system so a close request from ANYWHERE (a panel's
// own header X, a route's own trigger button) can route through the same
// handle. Plain object, not store state — it's a live ref to a mounted
// component instance, not serializable data.
//
// NOTE, corrected: an earlier version of this comment claimed a controlled
// `open={false}` prop transition does NOT play the exit animation and only
// `actionsRef.current.close()` does. That's false — tested directly, both
// race identically. The real hazard this registry exists for is a
// DIFFERENT one: Base UI's Drawer won't play an exit transition for a
// close requested before its own OPEN transition has settled (confirmed
// live: closing within ~20-40ms of opening removes the popup instantly,
// no matter which of the two mechanisms triggers it). Page's registered
// handle is where that's actually guarded — see the settle refs and
// `onOpenChangeComplete` wiring in apps/start/src/components/generic/page.tsx.
interface DrawerHandle {
	close: () => void;
}
const drawerHandles = new Map<string, DrawerHandle>();

function createCompleteState(partialState: Partial<SidebarStoreState>): SidebarStoreState {
	return {
		sidebars: partialState.sidebars || {},
		keyboardShortcuts: partialState.keyboardShortcuts || {},
	};
}

// Load initial state from localStorage
function loadPersistedState(): SidebarStoreState {
	if (typeof window === "undefined") {
		return createCompleteState({});
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return createCompleteState(JSON.parse(stored));
		}
	} catch (error) {
		console.error("Failed to load sidebar state from localStorage:", error);
	}

	return createCompleteState({});
}

// Save state to localStorage
function persistState(state: SidebarStoreState) {
	if (typeof window === "undefined") return;

	try {
		// Exclude `content` / `header` / `tabs` — they can carry non-serializable
		// React nodes, and are re-supplied by whoever opens the panel anyway.
		const serializableState = {
			sidebars: Object.fromEntries(
				Object.entries(state.sidebars).map(([id, sidebar]) => [
					id,
					{
						open: sidebar.open,
						openMobile: sidebar.openMobile,
						variant: sidebar.variant,
						side: sidebar.side,
						keyboardShortcut: sidebar.keyboardShortcut,
						activeItem: sidebar.activeItem,
						isPanel: sidebar.isPanel,
						anchored: sidebar.anchored,
						width: sidebar.width,
						height: sidebar.height,
						mobileZoom: sidebar.mobileZoom,
						resizedWidth: sidebar.resizedWidth,
						lastTriggerId: sidebar.lastTriggerId,
						activeTab: sidebar.activeTab,
					},
				])
			),
			keyboardShortcuts: state.keyboardShortcuts,
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState));
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

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: newState,
				},
				keyboardShortcuts: newKeyboardShortcuts,
			});
		});
	},

	unregisterSidebar: (id: string) => {
		sidebarStore.setState((state) => {
			const removedSidebar = state.sidebars[id];
			const { [id]: _, ...rest } = state.sidebars;

			// Remove keyboard shortcut mapping if exists
			const newKeyboardShortcuts = { ...state.keyboardShortcuts };
			if (removedSidebar?.keyboardShortcut) {
				delete newKeyboardShortcuts[removedSidebar.keyboardShortcut];
			}

			return createCompleteState({
				sidebars: rest,
				keyboardShortcuts: newKeyboardShortcuts,
			});
		});
	},

	// Toggle sidebar/panel open state. `isMobile` is only meaningful for a
	// nav sidebar — panels never pass it (defaults false, and setOpen
	// mirrors when it's false).
	toggleSidebar: (id: string, isMobile = false) => {
		const sidebar = sidebarStore.state.sidebars[id];
		if (!sidebar) return;
		sidebarActions.setOpenForBreakpoint(id, isMobile ? !sidebar.openMobile : !sidebar.open, isMobile);
	},

	// The default, used by everything panel-related. Always writes BOTH
	// `open` and `openMobile` together, so a panel can never end up with
	// the two fields disagreeing.
	setOpen: (id: string, open: boolean) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, open, openMobile: open },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	// Sets just one breakpoint's open field, leaving the other alone — only
	// a genuinely-independent-per-breakpoint nav sidebar should use this.
	setOpenForBreakpoint: (id: string, open: boolean, isMobile: boolean) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: {
						...sidebar,
						...(isMobile ? { openMobile: open } : { open }),
					},
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	// Resync a panel's config-authoritative fields from its current
	// PanelConfig, even when a sidebar entry already exists in the store
	// (e.g. a stale entry persisted to localStorage from a previous visit).
	// registerSidebar is only called on a panel's FIRST-EVER registration —
	// deliberately, so it doesn't stomp a persisted `open` value on every
	// remount — but that means anchored/width/height/mobileZoom, which are
	// pure app config (not user state), could otherwise go stale forever
	// for a returning user if the route's config ever changes them. Call
	// this on every panel registration, in addition to (not instead of)
	// registerSidebar's first-mount path. Deliberately excludes
	// `open`/`openMobile` — those are the one thing persistence should
	// keep sticky.
	syncPanelConfig: (id: string, config: Pick<SidebarState, "anchored" | "width" | "height" | "mobileZoom">) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, ...config },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	// User-driven resize — see resizedWidth's doc comment on SidebarState for
	// why this is separate from syncPanelConfig's `width`.
	setResizedWidth: (id: string, widthPx: number) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, resizedWidth: widthPx },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	registerDrawerHandle: (id: string, handle: DrawerHandle) => {
		drawerHandles.set(id, handle);
	},
	unregisterDrawerHandle: (id: string) => {
		drawerHandles.delete(id);
	},

	// Closes a panel — animates out via the registered drawer handle if
	// one's mounted, otherwise just flips `open` directly. Prefer this over
	// setOpen(id, false) for any user-facing close action so the animation
	// isn't silently skipped.
	close: (id: string) => {
		const handle = drawerHandles.get(id);
		if (handle) handle.close();
		else sidebarActions.setOpen(id, false);
	},

	setVariant: (id: string, variant: SidebarState["variant"]) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, variant },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
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

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, keyboardShortcut: shortcut },
				},
				keyboardShortcuts: newKeyboardShortcuts,
			});
		});
	},

	setActiveItem: (id: string, item: string) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, activeItem: item },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	setPanelContent: (id: string, content: React.ReactNode, triggerId?: string) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return { ...state, sidebars: { ...state.sidebars, [id]: { ...sidebar, content, lastTriggerId: triggerId } } };
		});
	},

	setPanelHeader: (id: string, header: PanelHeaderConfig) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return { ...state, sidebars: { ...state.sidebars, [id]: { ...sidebar, header } } };
		});
	},

	setLastTriggerId: (id: string, triggerId: string) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, lastTriggerId: triggerId },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	setActiveTab: (id: string, tabId: string) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, activeTab: tabId },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
		});
	},

	setTabs: (id: string, tabs: PanelTabConfig[]) => {
		sidebarStore.setState((state) => {
			const sidebar = state.sidebars[id];
			if (!sidebar) return state;

			return createCompleteState({
				sidebars: {
					...state.sidebars,
					[id]: { ...sidebar, tabs },
				},
				keyboardShortcuts: state.keyboardShortcuts,
			});
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
			sidebarStore.setState((_) => createCompleteState({}));
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

			return createCompleteState({
				sidebars: rest,
				keyboardShortcuts: newKeyboardShortcuts,
			});
		});
	},

	getSidebar: (id: string) => sidebarStore.state.sidebars[id],
};

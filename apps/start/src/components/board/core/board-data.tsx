import type { schema } from "@repo/database";
import { createContext, type MouseEvent, type ReactNode, useCallback, useContext, useMemo } from "react";
import {
	type BoardGroupingDefinition,
	createGroupingRegistry,
	type GroupingRegistry,
} from "../config/grouping-registry";
import { DEFAULT_GROUPING_REGISTRY } from "../config/groupings";
import type { SavedViewsSource } from "../saved-views/saved-views-source";
import type { BoardViewDefinition } from "../views/view-registry-model";
import type { BoardItem, TaskItem } from "./board-item";
import type { BoardItemActions } from "./board-item-actions";
import { deriveAssignableUsers, deriveFilterUsers } from "./board-users";
import { type BoardCapabilities, resolveCapabilities } from "./capabilities";
import {
	ALL_FIELDS_EDITABLE,
	type BoardFieldPermissions,
	getBoardFieldPermissions,
	NO_FIELDS_EDITABLE,
} from "./field-permissions";
import { isPlainLeftClick } from "./open-item";
import type { BoardRenderers } from "./renderers";
import { BoardScopeProvider } from "./scope";
import { type BoardScope, LEGACY_BOARD_SCOPE } from "./scope-config";

export interface BoardDataStatus {
	isLoading: boolean;
	isError: boolean;
	retry: () => void;
}

/** The one org a single-org board shows (an org's tasks page, a release). */
export interface BoardOrganizationScope {
	id: string;
	shortId: string;
}

export interface BoardDataPagination {
	hasMore: boolean;
	isFetchingMore: boolean;
	loadMore: () => void;
	loadMoreLabel?: string;
}

/**
 * Everything the board reads about the world, supplied by whoever mounts it — the
 * board itself never fetches and never reaches into a page-specific context
 * (the signed-in /home one is wrapped by core/admin-board-provider.tsx).
 */
export interface BoardDataSource<T extends BoardItem = TaskItem> {
	items: readonly T[];
	labels: readonly schema.labelType[];
	categories: readonly schema.categoryType[];
	releases: readonly schema.releaseType[];
	/**
	 * Every person the pickers/filters may offer. Absent = derived from `items`
	 * (see core/board-users.ts), which is what the board did before this existed.
	 */
	users?: readonly schema.UserSummary[];
	status?: BoardDataStatus;
	pagination?: BoardDataPagination;
	/**
	 * `items` are final: the host already applied its own filters, completed-visibility and ordering (e.g. the
	 * public Feedback board, whose endpoint is server-sorted and paged). `Board` then skips its own filter /
	 * showCompleted / sort pass and renders the items exactly as given. Absent/false = `Board` arranges them.
	 */
	passthrough?: boolean;
	/**
	 * Race-free write to the live item list: the updater receives the LATEST list, never one
	 * captured from a render. Absent = read-only data; writers must no-op.
	 */
	updateItems?: (updater: (prev: readonly T[]) => readonly T[]) => void;
	/**
	 * A hook (called once per row/card/menu) giving the actions available on one item.
	 * MUST have a stable identity for a given provider — it is called as a hook, so
	 * swapping it between renders would change the hook order.
	 */
	useItemActions?: (item: T) => BoardItemActions;
	/**
	 * Set = a single-org board: every item belongs to this org. Rows/cards then show the bare task key
	 * (no org avatar/slot), and the `org` grouping, quick-filter tab and filter field are not offered.
	 * Absent = cross-org (/home).
	 */
	organizationScope?: BoardOrganizationScope;
	/**
	 * The viewer's permissions per org id, for per-field edit gating (core/field-permissions.ts). Absent,
	 * or no entry for an item's org = no gating (only `canEditFields` applies). Needs `viewerId`.
	 */
	permissions?: Readonly<Record<string, schema.TeamPermissions>>;
	/** The signed-in user's id — creators/assignees may edit their own tasks whatever their permissions. */
	viewerId?: string;
	/**
	 * Opens an item in the host's own surface (e.g. the org tasks page's task dialog). Present = the context
	 * menu offers "Open in dialog". Keep it stable.
	 */
	openItem?: (item: T) => void;
	/**
	 * With `openItem`: a plain left click on a row/card calls it instead of following the row's link
	 * (modifier/middle clicks still open the link — see core/open-item.ts). Absent/false = rows are links.
	 */
	openItemOnClick?: boolean;
}

interface BoardContextValue {
	data: BoardDataSource;
	capabilities: BoardCapabilities;
	groupings: GroupingRegistry;
	/** The page's registered views; absent = the default set (read via `useBoardViews()`). */
	views?: readonly BoardViewDefinition[];
	/** The page's presentation slots; absent = the default admin rendering (read via `useBoardRenderers()`). */
	renderers?: BoardRenderers;
	/** The saved views offered; absent = the personal views (read via `useBoardSavedViews()`). */
	savedViews?: SavedViewsSource;
}

const BoardContext = createContext<BoardContextValue | undefined>(undefined);

interface BoardProviderProps {
	data: BoardDataSource;
	capabilities: BoardCapabilities;
	/** View-state scope (persistence, URL sync, saved views). Absent = the legacy admin scope. Keep it stable. */
	scope?: BoardScope;
	/**
	 * Extra grouping definitions (a page's own columns), merged OVER the built-ins by id. Keep the array stable
	 * (module-level or memoised) — a new array each render rebuilds the registry.
	 */
	groupings?: readonly BoardGroupingDefinition[];
	/**
	 * The views this board offers (see views/view-registry.tsx). Absent = DEFAULT_BOARD_VIEWS (list, kanban,
	 * card). Keep the array stable (module-level or memoised).
	 */
	views?: readonly BoardViewDefinition[];
	/**
	 * Presentation slots (row / card / list container / footer / states) replacing the default admin
	 * rendering — see core/renderers.ts. Absent = BoardRow / BoardCard / BoardLoadMore. Keep it stable
	 * (module-level or memoised): it is part of the context value.
	 */
	renderers?: BoardRenderers;
	/**
	 * Where the saved-view UI reads and writes views (saved-views/saved-views-source.ts). Absent = the
	 * signed-in user's personal views. Memoise it.
	 */
	savedViews?: SavedViewsSource;
	children: ReactNode;
}

/**
 * Supplies a board its data and what the viewer may do with it. Callers should pass a
 * memoised `data` (and a stable `capabilities`) — a fresh object per render re-renders
 * every board consumer.
 */
export function BoardProvider({
	data,
	capabilities,
	scope = LEGACY_BOARD_SCOPE,
	groupings: extraGroupings,
	views,
	renderers,
	savedViews,
	children,
}: BoardProviderProps) {
	const groupings = useMemo(
		() =>
			extraGroupings
				? createGroupingRegistry(Array.from(DEFAULT_GROUPING_REGISTRY.values()), extraGroupings)
				: DEFAULT_GROUPING_REGISTRY,
		[extraGroupings]
	);
	const value = useMemo<BoardContextValue>(
		() => ({ data, capabilities, groupings, views, renderers, savedViews }),
		[data, capabilities, groupings, views, renderers, savedViews]
	);
	return (
		<BoardContext.Provider value={value}>
			<BoardScopeProvider scope={scope}>{children}</BoardScopeProvider>
		</BoardContext.Provider>
	);
}

function useBoardContext(): BoardContextValue {
	const context = useContext(BoardContext);
	if (context === undefined) {
		throw new Error("useBoardData must be used within a BoardProvider");
	}
	return context;
}

export function useBoardData(): BoardDataSource {
	return useBoardContext().data;
}

export function useBoardCapabilities(): BoardCapabilities {
	return useBoardContext().capabilities;
}

/** The grouping registry in force: the built-ins plus whatever the provider was given. */
export function useBoardGroupings(): GroupingRegistry {
	return useBoardContext().groupings;
}

/**
 * The views the provider was given, or undefined when it gave none. Prefer `useBoardViews()` from
 * views/view-registry.tsx, which applies the default set.
 */
export function useBoardViewsOverride(): readonly BoardViewDefinition[] | undefined {
	return useBoardContext().views;
}

/**
 * The saved-views source the provider was given, or undefined (also outside any provider). Prefer
 * `useBoardSavedViews()` from saved-views/use-board-saved-views.ts, which applies the personal default.
 */
export function useBoardSavedViewsOverride(): SavedViewsSource | undefined {
	return useContext(BoardContext)?.savedViews;
}

/** The single org this board shows, or undefined on a cross-org board. */
export function useBoardOrganizationScope(): BoardOrganizationScope | undefined {
	return useBoardContext().data.organizationScope;
}

/**
 * Same as `useBoardOrganizationScope()`, but safe outside a `BoardProvider` (undefined there) — for hooks
 * that also run above the provider, like `useBoardViewState()` under /home's Cmd+K commands.
 */
export function useOptionalBoardOrganizationScope(): BoardOrganizationScope | undefined {
	return useContext(BoardContext)?.data.organizationScope;
}

/**
 * The link click handler for an item's row/card: when the data source opens items itself on click
 * (`openItem` + `openItemOnClick`), a plain left click calls `openItem` instead of navigating. Returns
 * whether it took the click over (the link's default was prevented).
 */
export function useBoardOpenItemClick(): (item: TaskItem, event: MouseEvent<HTMLAnchorElement>) => boolean {
	const { openItem, openItemOnClick } = useBoardData();
	return useCallback(
		(item: TaskItem, event: MouseEvent<HTMLAnchorElement>) => {
			if (!openItem || !openItemOnClick || !isPlainLeftClick(event)) return false;
			event.preventDefault();
			openItem(item);
			return true;
		},
		[openItem, openItemOnClick]
	);
}

/**
 * A function giving what the viewer may edit on a task: off entirely without `canEditFields`, else
 * the per-field permissions for the task's org (everything when the data source supplies none). For
 * callers resolving several tasks at once (the bulk bar); one task = `useFieldPermissions(task)`.
 */
export function useFieldPermissionsResolver(): (task: TaskItem) => BoardFieldPermissions {
	const { permissions, viewerId } = useBoardData();
	const { canEditFields } = useBoardCapabilities();
	return useCallback(
		(task: TaskItem) => {
			if (!canEditFields) return NO_FIELDS_EDITABLE;
			if (!permissions) return ALL_FIELDS_EDITABLE;
			return getBoardFieldPermissions(task, viewerId, permissions[task.organizationId]);
		},
		[canEditFields, permissions, viewerId]
	);
}

/** What the viewer may edit on `task` — `canEditFields` AND the per-field permissions (see the resolver above). */
export function useFieldPermissions(task: TaskItem): BoardFieldPermissions {
	return useFieldPermissionsResolver()(task);
}

const NO_RENDERERS: BoardRenderers = {};

/** The presentation slots the provider supplied, or an empty object (every slot then falls back to the default). */
export function useBoardRenderers(): BoardRenderers {
	return useBoardContext().renderers ?? NO_RENDERERS;
}

/**
 * Narrows the board's capabilities to what `view` supports (a view that can't drag turns `canDrag` off
 * for everything rendered inside, even on a board that allows it). A view can only narrow, never grant.
 * Passes the existing context through untouched when nothing changes.
 */
export function BoardViewCapabilityScope({
	view,
	children,
}: {
	view: Pick<BoardViewDefinition, "supports">;
	children: ReactNode;
}) {
	const context = useBoardContext();
	const canDrag = view.supports.drag;
	const value = useMemo<BoardContextValue>(() => {
		const resolved = resolveCapabilities(context.capabilities, undefined, { supports: { drag: canDrag } });
		return resolved.canDrag === context.capabilities.canDrag ? context : { ...context, capabilities: resolved };
	}, [context, canDrag]);
	return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

const NOOP_ITEM_ACTIONS: BoardItemActions = { execute: () => Promise.resolve() };

// Module-level so its identity is stable: it stands in for `useItemActions` on a
// read-only data source and is called as a hook like the real one.
function useNoopItemActions(): BoardItemActions {
	return NOOP_ITEM_ACTIONS;
}

/** The actions for one item; a no-op `execute` when the data source is read-only. */
export function useBoardItemActions(item: TaskItem): BoardItemActions {
	const { useItemActions } = useBoardData();
	const useActions = useItemActions ?? useNoopItemActions;
	return useActions(item);
}

/**
 * Who a task in `organizationId` can be assigned to — the data source's `users` when
 * it provides them, else the assignees seen on that org's items.
 */
export function useBoardAssignableUsers(organizationId: string): readonly schema.UserSummary[] {
	const { items, users } = useBoardData();
	return useMemo(() => users ?? deriveAssignableUsers(items, organizationId), [users, items, organizationId]);
}

/** The user list the filter pickers resolve assignee/creator against. */
export function useBoardFilterUsers(): readonly schema.UserSummary[] {
	const { items, users } = useBoardData();
	return useMemo(() => users ?? deriveFilterUsers(items), [users, items]);
}

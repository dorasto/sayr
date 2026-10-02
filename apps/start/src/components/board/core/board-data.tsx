import type { schema } from "@repo/database";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	type BoardGroupingDefinition,
	createGroupingRegistry,
	type GroupingRegistry,
} from "../config/grouping-registry";
import { DEFAULT_GROUPING_REGISTRY } from "../config/groupings";
import type { BoardItem, TaskItem } from "./board-item";
import type { BoardItemActions } from "./board-item-actions";
import { deriveAssignableUsers, deriveFilterUsers } from "./board-users";
import type { BoardViewDefinition } from "../views/view-registry-model";
import { type BoardCapabilities, resolveCapabilities } from "./capabilities";
import type { BoardRenderers } from "./renderers";
import { BoardScopeProvider } from "./scope";
import { type BoardScope, LEGACY_BOARD_SCOPE } from "./scope-config";

export interface BoardDataStatus {
	isLoading: boolean;
	isError: boolean;
	retry: () => void;
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
}

/**
 * Which token set the board renders with. "portal" opts into the public portal's palette
 * (a scoped remap in styles.css keyed on `data-board-theme="portal"`, only effective inside `.portal`).
 */
export type BoardTheme = "admin" | "portal";

interface BoardContextValue {
	data: BoardDataSource;
	capabilities: BoardCapabilities;
	theme: BoardTheme;
	groupings: GroupingRegistry;
	/** The page's registered views; absent = the default set (read via `useBoardViews()`). */
	views?: readonly BoardViewDefinition[];
	/** The page's presentation slots; absent = the default admin rendering (read via `useBoardRenderers()`). */
	renderers?: BoardRenderers;
}

const BoardContext = createContext<BoardContextValue | undefined>(undefined);

interface BoardProviderProps {
	data: BoardDataSource;
	capabilities: BoardCapabilities;
	/** View-state scope (persistence, URL sync, saved views). Absent = the legacy admin scope. Keep it stable. */
	scope?: BoardScope;
	/** Token set. Defaults to "admin". */
	theme?: BoardTheme;
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
	theme = "admin",
	groupings: extraGroupings,
	views,
	renderers,
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
		() => ({ data, capabilities, theme, groupings, views, renderers }),
		[data, capabilities, theme, groupings, views, renderers]
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

export function useBoardTheme(): BoardTheme {
	return useBoardContext().theme;
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

import type { schema } from "@repo/database";
import type { ComponentType } from "react";
import type { BoardGroupingDefinition } from "../config/grouping-registry";
import { applyFilterState, type FilterFieldExtractor } from "../filter/filter-engine";
import type { BoardSortField, BoardSortFieldOption, TaskSortDirection } from "../filter/sort-config";
import type { FilterField, FilterFieldConfig, FilterState, TaskGroupingId } from "../filter/types";
import type { BoardViewDefinition } from "../views/view-registry-model";
import type { BoardDataSource } from "./board-data";
import type { BoardItem } from "./board-item";

// What makes the board render one kind of item rather than another. The shell, the list/kanban/card
// views, the grouping/filter/sort engines, the filter builder, quick filters, count label and view
// options are generic; everything they need to know about the items comes from a `BoardEntity`.
// Tasks are the built-in entity (core/task-entity.tsx, the default when a provider names none);
// releases are the second (components/releases/board/release-board-entity.tsx).
//
// A `.ts` file with type-only imports apart from the pure filter engine, so vitest can cover the helpers.

/** A noun for counts ("3 releases"). */
export interface BoardEntityNoun {
	singular: string;
	plural: string;
}

/** A drop the views hand to the entity's drop executor: which item went to which (sub-)group. */
export interface BoardDragMutation<T extends BoardItem = BoardItem> {
	item: T;
	/** A registered grouping id. */
	grouping: string;
	groupId: string;
	/** A registered grouping id, or "none". */
	subGrouping: string;
	subGroupId?: string;
}

export interface BoardEntityRowProps<T extends BoardItem> {
	item: T;
	/** Rendered as a child under its parent's row (only entities with `subItems` nest). */
	nested?: boolean;
}

export interface BoardEntityCardProps<T extends BoardItem> {
	item: T;
	/** Which view it sits in: a kanban cell or the card-view grid. */
	variant?: "kanban" | "grid";
}

export interface BoardEntityDropExecutorProps<T extends BoardItem> {
	mutation: BoardDragMutation<T>;
	/** Call once the drop has been dispatched (or refused); the view then unmounts the executor. */
	onHandled: () => void;
}

/** Parent/child nesting in the list view (tasks' subtasks). Absent = every item is a top-level row. */
export interface BoardEntitySubItems<T extends BoardItem> {
	/** Items that get their own row (children whose parent is in the list nest under it instead). */
	topLevel(items: readonly T[]): T[];
	/** parent id -> its children present in `items`. */
	childrenByParent(items: readonly T[]): Map<string, T[]>;
}

export interface BoardEntity<T extends BoardItem> {
	/** "task", "release", … — also what `useBoardData()` checks before handing out task-typed data. */
	id: string;
	noun: BoardEntityNoun;

	/** The grouping definitions this entity's board offers (a provider's `groupings` are merged over them). */
	groupings: readonly BoardGroupingDefinition<T>[];
	/** The "Group by" menu, in order. `org` is dropped on a single-org board. */
	groupingMenu: readonly TaskGroupingId[];

	/** Every filterable field (FilterBuilder, condition rows, quick filters). */
	filterFields: readonly FilterFieldConfig<T>[];
	/** The quick-filter panel's tabs, in order (`org` is dropped on a single-org board). */
	quickFilterFields: readonly FilterField[];
	/** An item's raw value(s) for a filter field. */
	extractFilterValue: FilterFieldExtractor<T>;

	/** The "Sort by" menu. */
	sortFields: readonly BoardSortFieldOption[];
	/** A sorted copy (or `items` itself when `sortBy` isn't one of this entity's fields). */
	sort(items: readonly T[], sortBy: BoardSortField, direction: TaskSortDirection): readonly T[];

	/** Hidden while the view state's `showCompletedTasks` is off (tasks: done/canceled; releases: archived). */
	isCompleted(item: T): boolean;
	/** The view options' label for that toggle. */
	completedToggleLabel: string;

	/** The views offered when the provider registers none. Absent = the board's default list + kanban. */
	views?: readonly BoardViewDefinition<T>[];
	/** One list row. */
	Row: ComponentType<BoardEntityRowProps<T>>;
	/** One kanban / card-view card. */
	Card: ComponentType<BoardEntityCardProps<T>>;
	/** Executes a drag-to-regroup drop. Absent = drops are no-ops. Only mounted while `canDrag`. */
	DropExecutor?: ComponentType<BoardEntityDropExecutorProps<T>>;
	/** Rendered by `Board` under the views while `canBulk` (tasks' bulk action bar), given the visible items. */
	BulkBar?: ComponentType<{ items: readonly T[] }>;
	subItems?: BoardEntitySubItems<T>;
	/** The people the filter pickers resolve against when the data source supplies no `users`. Absent = none. */
	deriveUsers?(items: readonly T[]): readonly schema.UserSummary[];
}

/**
 * Type-erases an entity for the board's React context, which is shared by every entity. Sound by
 * construction: `BoardProvider` only ever pairs an entity with a data source of the same `T`, so every
 * callback of the erased entity is only called with that data source's items. The one place this is asserted.
 */
export function eraseBoardEntity<T extends BoardItem>(entity: BoardEntity<T>): BoardEntity<BoardItem> {
	return entity as unknown as BoardEntity<BoardItem>;
}

/** The data-source half of `eraseBoardEntity` (same reasoning). */
export function eraseBoardData<T extends BoardItem>(data: BoardDataSource<T>): BoardDataSource<BoardItem> {
	return data as unknown as BoardDataSource<BoardItem>;
}

/** The views half of `eraseBoardEntity` (same reasoning). */
export function eraseBoardViews<T extends BoardItem>(
	views: readonly BoardViewDefinition<T>[] | undefined
): readonly BoardViewDefinition<BoardItem>[] | undefined {
	return views as unknown as readonly BoardViewDefinition<BoardItem>[] | undefined;
}

/** The groupings half of `eraseBoardEntity` (same reasoning). */
export function eraseBoardGroupings<T extends BoardItem>(
	groupings: readonly BoardGroupingDefinition<T>[] | undefined
): readonly BoardGroupingDefinition<BoardItem>[] | undefined {
	return groupings as unknown as readonly BoardGroupingDefinition<BoardItem>[] | undefined;
}

type ArrangingEntity<T extends BoardItem> = Pick<BoardEntity<T>, "extractFilterValue" | "isCompleted" | "sort">;

/** The entity's items matching `filters`. */
export function filterEntityItems<T extends BoardItem>(
	entity: Pick<BoardEntity<T>, "extractFilterValue">,
	items: readonly T[],
	filters: FilterState
): readonly T[] {
	return applyFilterState(items, filters, entity.extractFilterValue);
}

/** `items` without the completed ones unless `showCompleted`. */
export function scopeCompletedItems<T extends BoardItem>(
	entity: Pick<BoardEntity<T>, "isCompleted">,
	items: readonly T[],
	showCompleted: boolean
): readonly T[] {
	return showCompleted ? items : items.filter((item) => !entity.isCompleted(item));
}

export interface ArrangeOptions {
	filters: FilterState;
	showCompleted: boolean;
	sortBy: BoardSortField | "none";
	sortDirection: TaskSortDirection;
	/** The active grouping decides membership/order: only the user's filters apply. */
	ownsMembership?: boolean;
}

/** What `Board` renders: filtered, then (unless the grouping owns membership) completed-scoped and sorted. */
export function arrangeBoardItems<T extends BoardItem>(
	entity: ArrangingEntity<T>,
	items: readonly T[],
	{ filters, showCompleted, sortBy, sortDirection, ownsMembership = false }: ArrangeOptions
): readonly T[] {
	const filtered = filterEntityItems(entity, items, filters);
	if (ownsMembership) return filtered;
	const scoped = scopeCompletedItems(entity, filtered, showCompleted);
	return sortBy !== "none" ? entity.sort(scoped, sortBy, sortDirection) : scoped;
}

/** "1 release" / "3 releases". */
export function formatEntityCount(noun: BoardEntityNoun, count: number): string {
	return `${count} ${count === 1 ? noun.singular : noun.plural}`;
}

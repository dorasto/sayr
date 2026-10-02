import type { BoardColumn } from "../config/grouping-registry";
import type { BoardItem } from "../core/board-item";

// The pure column -> grid-model derivation behind board-kanban-view.tsx, split out so it can be
// unit-tested (apps/start's vitest has no `@/` alias and no DOM: relative imports only, and the
// imports above are type-only).

/** What GridBoardProvider receives for each column header. */
export interface KanbanColumnModel {
	id: string;
	label: string;
	count: number;
	icon: BoardColumn["icon"];
	header: BoardColumn["header"];
	description: BoardColumn["description"];
	emptyMessage: BoardColumn["emptyMessage"];
}

/** What GridBoardProvider receives for each sub-group row. */
export interface KanbanRowModel {
	id: string;
	label: string;
	count: number;
	icon: BoardColumn["icon"];
	toneClassName: BoardColumn["toneClassName"];
	color: BoardColumn["color"];
}

/** One card in one cell. `id` is unique per cell; `taskId` is the underlying item's own id. */
export interface KanbanGridItem<T extends BoardItem> {
	id: string;
	taskId: string;
	task: T;
	columnId: string;
	rowId?: string;
}

/**
 * The id a card gets in the grid. Normally the bare item id, but an item that can sit in several
 * cells at once (a multi-assignee task under assignee grouping) needs the cell baked in, or its
 * cards would collide.
 */
export function getGridItemId(
	item: BoardItem,
	columnId: string,
	rowId: string | undefined,
	multiMembership: boolean
): string {
	return multiMembership ? `${item.id}:${columnId}:${rowId ?? "none"}` : item.id;
}

/**
 * Kanban has no collapse affordance (unlike list view's collapsible sections), so an empty column is
 * permanent dead space with a "0" badge — dropped unless the grouping asks to keep its empty columns.
 */
export function buildKanbanColumns<T extends BoardItem>(
	columns: readonly BoardColumn<T>[],
	keepEmptyColumns: boolean
): KanbanColumnModel[] {
	return columns
		.filter((column) => keepEmptyColumns || column.items.length > 0)
		.map((column) => ({
			id: column.id,
			label: column.label,
			count: column.items.length,
			icon: column.icon,
			header: column.header,
			description: column.description,
			emptyMessage: column.emptyMessage,
		}));
}

/** Sub-group rows, with the same empty-dropping rule as the columns. */
export function buildKanbanRows<T extends BoardItem>(
	rows: readonly BoardColumn<T>[],
	keepEmptyColumns: boolean
): KanbanRowModel[] {
	return rows
		.filter((row) => keepEmptyColumns || row.items.length > 0)
		.map((row) => ({
			id: row.id,
			label: row.label,
			count: row.items.length,
			icon: row.icon,
			toneClassName: row.toneClassName,
			color: row.color,
		}));
}

/**
 * Flattens columns (and their sub-groups, when sub-grouped) into one grid item per card per cell.
 * With sub-grouping an item's cell is (column, sub-group); without, just the column.
 */
export function buildKanbanItems<T extends BoardItem>(
	columns: readonly BoardColumn<T>[],
	{ hasSubGroups, multiMembership }: { hasSubGroups: boolean; multiMembership: boolean }
): KanbanGridItem<T>[] {
	if (!hasSubGroups) {
		return columns.flatMap((column) =>
			column.items.map((item) => ({
				id: getGridItemId(item, column.id, undefined, multiMembership),
				taskId: item.id,
				task: item,
				columnId: column.id,
			}))
		);
	}

	return columns.flatMap((column) =>
		(column.subGroups ?? []).flatMap((subGroup) =>
			subGroup.items.map((item) => ({
				id: getGridItemId(item, column.id, subGroup.id, multiMembership),
				taskId: item.id,
				task: item,
				columnId: column.id,
				rowId: subGroup.id,
			}))
		)
	);
}

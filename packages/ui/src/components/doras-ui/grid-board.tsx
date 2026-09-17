"use client";

import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
	closestCenter,
	DndContext,
	DragOverlay,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { createContext, type HTMLAttributes, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";
import tunnel from "tunnel-rat";

const t = tunnel();

// ============================================================================
// Types
// ============================================================================

export interface GridBoardColumnData {
	id: string;
	label: string;
	count: number;
	icon?: ReactNode;
	accentClassName?: string;
}

export interface GridBoardRowData {
	id: string;
	label: string;
	count?: number;
	icon?: ReactNode;
	accentClassName?: string;
	/** Semantic theme-token tint (e.g. "bg-primary/5") — mirrors GridBoardColumnData's tone story for consumers that color-code sub-groups (status/priority). */
	toneClassName?: string;
	/** Raw hex tint for consumers whose sub-group has a user-picked color with no theme-token equivalent (category/release). */
	color?: string;
}

export type GridBoardItemBase = {
	id: string;
	columnId: string;
	rowId?: string;
};

/** Event data passed to onDragEnd - includes the target cell info */
export type GridBoardDragEndEvent<TItem extends GridBoardItemBase = GridBoardItemBase> = {
	item: TItem;
	fromColumnId: string;
	fromRowId?: string;
	toColumnId: string;
	toRowId?: string;
	/** The original dnd-kit event */
	event: DragEndEvent;
};

// ============================================================================
// Context
// ============================================================================

export type GridBoardMode = "grid" | "kanban";

type GridBoardContextProps<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
> = {
	columns: TColumn[];
	rows?: TRow[];
	items: TItem[];
	getItemsForCell: (columnId: string, rowId?: string) => TItem[];
	activeItemId: string | null;
	renderDragOverlay?: (item: TItem) => ReactNode;
	mode: GridBoardMode;
};

const GridBoardContext = createContext<GridBoardContextProps | null>(null);

function useGridBoardContext<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
>() {
	const context = useContext(GridBoardContext) as GridBoardContextProps<TItem, TColumn, TRow> | null;
	if (!context) {
		throw new Error("GridBoard components must be used within a GridBoardProvider");
	}
	return context;
}

// ============================================================================
// Helper: Parse cell ID to get column and row
// ============================================================================

/**
 * Cell IDs are formatted as "cell:{columnId}" or "cell:{columnId}:{rowId}"
 * Note: columnId and rowId may contain colons (e.g., "status:backlog")
 * Format: "cell:status:backlog" or "cell:status:backlog:priority:medium"
 * We use a different delimiter to separate column from row
 */
function makeCellId(columnId: string, rowId?: string): string {
	// Use | as delimiter between columnId and rowId since : is used within IDs
	return rowId ? `cell|${columnId}|${rowId}` : `cell|${columnId}`;
}

function parseCellId(cellId: string): { columnId: string; rowId?: string } | null {
	if (!cellId.startsWith("cell|")) return null;
	const parts = cellId.split("|");
	if (parts.length === 2 && parts[1]) {
		return { columnId: parts[1] };
	}
	if (parts.length === 3 && parts[1] && parts[2]) {
		return { columnId: parts[1], rowId: parts[2] };
	}
	return null;
}

// ============================================================================
// GridBoardProvider - Main container with DndContext
// ============================================================================

export type GridBoardProviderProps<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
> = {
	columns: TColumn[];
	rows?: TRow[];
	items: TItem[];
	/** Custom function to get items for a cell. If not provided, filters items by columnId/rowId */
	getItemsForCell?: (columnId: string, rowId?: string) => TItem[];
	/** Called when an item is dropped into a new cell */
	onDragEnd?: (event: GridBoardDragEndEvent<TItem>) => void;
	/** Called when drag starts */
	onDragStart?: (event: DragStartEvent) => void;
	/** Custom render function for the drag overlay */
	renderDragOverlay?: (item: TItem) => ReactNode;
	/**
	 * Display mode:
	 * - "grid": 2D grid with rows (sub-groups), global scroll (default)
	 * - "kanban": Traditional kanban with full-height columns, each column scrolls independently
	 */
	mode?: GridBoardMode;
	children: ReactNode;
	className?: string;
};

export function GridBoardProvider<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
>({
	columns,
	rows,
	items,
	getItemsForCell,
	onDragEnd,
	onDragStart,
	renderDragOverlay,
	mode = "grid",
	children,
	className,
}: GridBoardProviderProps<TItem, TColumn, TRow>) {
	const [activeItemId, setActiveItemId] = useState<string | null>(null);
	const hasRows = rows && rows.length > 0;
	// In kanban mode without rows, we use full-height columns
	const isKanbanMode = mode === "kanban";

	// Sensors for drag detection
	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 10,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 250,
				tolerance: 5,
			},
		}),
		useSensor(KeyboardSensor)
	);

	// Default implementation for getting items in a cell
	const defaultGetItemsForCell = (columnId: string, rowId?: string): TItem[] => {
		return items.filter((item) => {
			if (item.columnId !== columnId) return false;
			if (rowId !== undefined && item.rowId !== rowId) return false;
			if (rowId === undefined && hasRows && item.rowId !== undefined) return false;
			return true;
		});
	};

	const getCellItems = getItemsForCell ?? defaultGetItemsForCell;

	const handleDragStart = (event: DragStartEvent) => {
		setActiveItemId(event.active.id as string);
		onDragStart?.(event);
	};

	const handleDragOver = (_event: DragOverEvent) => {
		// Could add visual feedback here if needed
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveItemId(null);

		const { active, over } = event;
		if (!over) {
			return;
		}

		const itemId = active.id as string;
		const overId = over.id as string;

		// Find the dragged item
		const item = items.find((i) => i.id === itemId);
		if (!item) {
			return;
		}

		// Determine target cell - could be dropping on a cell or on another item
		let targetColumnId: string | undefined;
		let targetRowId: string | undefined;

		// First, check if we dropped on a cell directly
		const cellInfo = parseCellId(overId);
		if (cellInfo) {
			targetColumnId = cellInfo.columnId;
			targetRowId = cellInfo.rowId;
		} else {
			// Dropped on an item - find which cell that item belongs to
			const overItem = items.find((i) => i.id === overId);
			if (overItem) {
				targetColumnId = overItem.columnId;
				targetRowId = overItem.rowId;
			}
		}

		// If we couldn't determine target, abort
		if (!targetColumnId) {
			return;
		}

		// Check if anything actually changed
		const fromColumnId = item.columnId;
		const fromRowId = item.rowId;
		if (fromColumnId === targetColumnId && fromRowId === targetRowId) {
			return;
		}

		// Call the handler with rich event data
		onDragEnd?.({
			item: item as TItem,
			fromColumnId,
			fromRowId,
			toColumnId: targetColumnId,
			toRowId: targetRowId,
			event,
		});
	};

	const contextValue: GridBoardContextProps<TItem, TColumn, TRow> = {
		columns,
		rows,
		items,
		getItemsForCell: getCellItems,
		activeItemId,
		renderDragOverlay,
		mode,
	};

	const activeItem = activeItemId ? items.find((i) => i.id === activeItemId) : null;

	return (
		<GridBoardContext.Provider value={contextValue as unknown as GridBoardContextProps}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<div
					className={cn(
						"h-full",
						// Grid mode: global scroll for the entire board
						!isKanbanMode && "overflow-auto",
						// Kanban mode: flex layout, horizontal scroll, columns handle vertical scroll
						isKanbanMode && "flex flex-col overflow-x-auto overflow-y-hidden",
						className
					)}
				>
					<div
						className={cn(
							// Grid mode: column layout, fit content width
							!isKanbanMode && "flex flex-col min-w-full w-fit",
							// Kanban mode: row layout for columns, fill height, fit content width but at least full width
							isKanbanMode && "flex flex-col flex-1 min-h-0 min-w-full w-fit"
							// Always zero gap here — the column header attaches directly into whatever's
							// beneath it (the single cells row with no sub-grouping, or the row-band stack
							// with it) so the whole column reads as one continuous piece, never a floating
							// pill sitting above a gap (see GridBoardColumnHeader/GridBoardRowHeader/
							// GridBoardCells' matching flat-edge rounding and zero inter-row gap).
						)}
					>
						{children}
					</div>
				</div>

				{/* Drag overlay portal */}
				{typeof window !== "undefined" &&
					createPortal(
						<DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
							{activeItem && renderDragOverlay ? renderDragOverlay(activeItem as TItem) : <t.Out />}
						</DragOverlay>,
						document.body
					)}
			</DndContext>
		</GridBoardContext.Provider>
	);
}

// ============================================================================
// GridBoardColumns - Renders column headers with render prop
// ============================================================================

export type GridBoardColumnsProps<TColumn extends GridBoardColumnData = GridBoardColumnData> = Omit<
	HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	children: (column: TColumn) => ReactNode;
};

export function GridBoardColumns<TColumn extends GridBoardColumnData = GridBoardColumnData>({
	children,
	className,
	...props
}: GridBoardColumnsProps<TColumn>) {
	const { columns } = useGridBoardContext<GridBoardItemBase, TColumn>();

	return (
		<div className={cn("flex gap-3 sticky top-0 z-30", className)} {...props}>
			{columns.map((column) => children(column))}
		</div>
	);
}

// ============================================================================
// GridBoardColumnHeader - Default column header component
// ============================================================================

export type GridBoardColumnHeaderProps = HTMLAttributes<HTMLDivElement> & {
	column: GridBoardColumnData;
};

export function GridBoardColumnHeader({ column, className, ...props }: GridBoardColumnHeaderProps) {
	return (
		<div
			className={cn(
				// Always flat-bottomed and attached directly to whatever's beneath it, zero gap,
				// zero standalone rounding — matches Linear-style boards where the column header
				// falls straight into the body below rather than floating as its own rounded pill.
				"flex items-center justify-between px-3.5 py-2.5 bg-muted border border-border min-w-[280px] flex-1 gap-2 rounded-t-xl",
				className
			)}
			{...props}
		>
			<div className="flex items-center gap-2 w-full">
				{column.icon && <span className={cn("text-sm", column.accentClassName)}>{column.icon}</span>}
				<span className="text-sm font-semibold">{column.label}</span>
				<span className="text-sm text-muted-foreground ml-auto">{column.count}</span>
			</div>
		</div>
	);
}

// ============================================================================
// GridBoardRows - Renders rows (sub-groups) with render prop
// ============================================================================

export type GridBoardRowsProps<
	TRow extends GridBoardRowData = GridBoardRowData,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	/** `isLast` marks the final row-band so its cells can close off the column's bottom rounding/border. */
	children: (row: TRow, columns: TColumn[], isLast: boolean) => ReactNode;
};

export function GridBoardRows<
	TRow extends GridBoardRowData = GridBoardRowData,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
>({ children, className, ...props }: GridBoardRowsProps<TRow, TColumn>) {
	const { rows, columns } = useGridBoardContext<GridBoardItemBase, TColumn, TRow>();

	if (!rows || rows.length === 0) {
		return null;
	}

	return (
		// Zero gap — row-bands stack continuously beneath the column header (falls inline, "goes
		// together") instead of reading as separate floating cards.
		<div className={cn("flex flex-col", className)} {...props}>
			{rows.map((row, index) => children(row, columns, index === rows.length - 1))}
		</div>
	);
}

// ============================================================================
// GridBoardRowHeader - Default row header component
// ============================================================================

export type GridBoardRowHeaderProps = HTMLAttributes<HTMLDivElement> & {
	row: GridBoardRowData;
	count?: number;
	/**
	 * Closes off the column's bottom rounding/border when this header is the
	 * final rendered piece for its column — e.g. a collapsed last row-band
	 * with no cells beneath it (see GridBoardCells' own isLast, which handles
	 * the expanded case).
	 */
	isLast?: boolean;
};

/**
 * Structural shell only — sticky positioning, side borders, background. Pass
 * `children` to fully replace the default icon/label/count content (e.g.
 * board-kanban-view.tsx swaps in GroupHeaderContent for color-tinted,
 * collapsible sub-group headers matching the list view's own convention);
 * omit it to get the plain default content unified-task-view.tsx still uses.
 */
export function GridBoardRowHeader({ row, count, isLast, className, children, ...props }: GridBoardRowHeaderProps) {
	const displayCount = count ?? row.count ?? 0;

	return (
		<div
			className={cn(
				// A sub-group header is a secondary level, not a peer of GridBoardColumnHeader.
				// No top border/rounding of its own — it's always sandwiched flush (zero gap)
				// between either the column header or the previous row-band's cells above, and
				// its own cells below, so only the side borders continue that seam. top-[42px]
				// matches GridBoardColumns' own height (measured live) so whichever row-band is
				// currently "active" pins directly under the column headers with no visible gap.
				"bg-background border-x border-border/40 sticky top-[42px] z-20 overflow-hidden",
				isLast && "rounded-b-xl border-b",
				className
			)}
			{...props}
		>
			{children ?? (
				<div className="flex items-center gap-1.5 px-2.5 py-1.5 sticky left-2.5 w-fit">
					{row.icon && <span className={cn("text-sm", row.accentClassName)}>{row.icon}</span>}
					<span className="text-xs font-medium whitespace-nowrap">{row.label}</span>
					<span className="text-xs text-muted-foreground tabular-nums">{displayCount}</span>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// GridBoardCells - Renders droppable cells for a row (or all cells if no rows)
// ============================================================================

export type GridBoardCellsProps<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	/** The row ID to get items for (undefined = no row grouping) */
	rowId?: string;
	/** Marks the last row-band so its strip closes off the column's bottom rounding/border. Ignored without rows. */
	isLast?: boolean;
	/** Render function for each item in a cell */
	children: (item: TItem, column: TColumn, rowId?: string) => ReactNode;
	/** Render empty cell content */
	renderEmpty?: () => ReactNode;
};

export function GridBoardCells<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
>({ rowId, isLast, children, renderEmpty, className, ...props }: GridBoardCellsProps<TItem, TColumn>) {
	const { columns, getItemsForCell, mode, rows } = useGridBoardContext<TItem, TColumn>();
	const isKanbanMode = mode === "kanban";
	const hasRows = !!rows && rows.length > 0;

	const defaultRenderEmpty = () => <div className="h-8" />;
	const emptyRenderer = renderEmpty ?? defaultRenderEmpty;

	return (
		<div
			className={cn(
				"flex",
				// With rows (sub-grouping), a row-band's cells read as one continuous strip —
				// shared border/background, thin dividers between columns — so they pair correctly
				// with the single continuous GridBoardRowHeader above instead of fragmenting into
				// separately-boxed, gapped columns under one unbroken bar. No top border/rounding
				// ever (flush into the header above); bottom rounding/border only on the last
				// row-band, so the whole column closes into one shape instead of every band
				// individually rounding at each internal seam. Without rows, each column keeps its
				// own fully-rounded attached box (see GridBoardDroppableCell).
				hasRows
					? cn(
							"divide-x divide-border/40 border-x border-border/40 bg-background overflow-hidden",
							isLast ? "rounded-b-xl border-b" : "border-b-0"
						)
					: "gap-3",
				isKanbanMode && "flex-1 min-h-0",
				className
			)}
			{...props}
		>
			{columns.map((column) => {
				const cellItems = getItemsForCell(column.id, rowId) as TItem[];
				const cellId = makeCellId(column.id, rowId);

				return (
					<GridBoardDroppableCell
						key={cellId}
						cellId={cellId}
						isEmpty={cellItems.length === 0}
						isKanbanMode={isKanbanMode}
						hasRows={hasRows}
					>
						<SortableContext items={cellItems.map((item) => item.id)}>
							{cellItems.length > 0 ? cellItems.map((item) => children(item, column, rowId)) : emptyRenderer()}
						</SortableContext>
					</GridBoardDroppableCell>
				);
			})}
		</div>
	);
}

// ============================================================================
// GridBoardDroppableCell - Internal droppable cell wrapper
// ============================================================================

type GridBoardDroppableCellProps = {
	cellId: string;
	isEmpty: boolean;
	isKanbanMode: boolean;
	hasRows: boolean;
	children: ReactNode;
};

function GridBoardDroppableCell({ cellId, isEmpty, isKanbanMode, hasRows, children }: GridBoardDroppableCellProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: cellId,
	});
	const usesCustomScrollbar = isKanbanMode || hasRows;
	const cellClassName = cn(
		"min-w-[280px] flex-1 transition-colors",
		// No rows: this cell is its own attached card, flat-topped directly beneath
		// GridBoardColumnHeader. With rows: the shared strip wrapper in GridBoardCells
		// owns the rounding/border/background for the whole row-band instead — this is
		// just a plain divided slot within it (see GridBoardCells' hasRows branch).
		hasRows ? "bg-transparent" : "rounded-b-xl rounded-t-none bg-background border border-t-0 border-border",
		isOver && "bg-primary/10 ring-1 ring-primary/30 ring-inset",
		// Grid mode: minimal height when empty
		!isKanbanMode && isEmpty && "min-h-[40px]",
		// Kanban mode: full height with independent Y scroll. No h-full here on
		// purpose — height:100% doesn't reliably resolve against this row's
		// flex-grow-derived height in every nesting this renders inside (reproduced:
		// columns silently shrink-to-content instead of stretching). min-h-0 +
		// default align-items:stretch (row's cross axis) does the same job without
		// depending on percentage-height resolution.
		isKanbanMode && "min-h-0",
		// With rows, the page itself scrolls (mode is "grid" whenever there's sub-grouping —
		// see board-kanban-view.tsx's mode switch), so a row-band's cards can't rely on a
		// flex-derived remaining-viewport-height the way plain kanban's columns do. A fixed
		// max-height + its own independent scroll keeps each row-band feeling like a normal
		// kanban column instead of growing the whole page to fit every card.
		hasRows && "max-h-[420px]"
	);

	if (usesCustomScrollbar) {
		return (
			<ScrollArea ref={setNodeRef} className={cellClassName}>
				<div className="flex min-h-full flex-col gap-2.5 p-2.5">{children}</div>
			</ScrollArea>
		);
	}

	return (
		<div ref={setNodeRef} className={cn(cellClassName, "flex flex-col gap-2.5 p-2.5")}>
			{children}
		</div>
	);
}

// ============================================================================
// GridBoardItem - Draggable item wrapper
// ============================================================================

export type GridBoardItemProps<TItem extends GridBoardItemBase = GridBoardItemBase> = {
	item: TItem;
	children: ReactNode;
	className?: string;
};

export function GridBoardItem<TItem extends GridBoardItemBase = GridBoardItemBase>({
	item,
	children,
	className,
}: GridBoardItemProps<TItem>) {
	const { activeItemId, renderDragOverlay } = useGridBoardContext<TItem>();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<>
			<div
				ref={setNodeRef}
				style={style}
				{...attributes}
				{...listeners}
				className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-30", className)}
			>
				{children}
			</div>
			{/* Tunnel the content to the drag overlay when this item is being dragged */}
			{activeItemId === item.id && !renderDragOverlay && <t.In>{children}</t.In>}
		</>
	);
}

// ============================================================================
// GridBoardCell - Individual cell wrapper (optional, for custom layouts)
// ============================================================================

export type GridBoardCellProps = HTMLAttributes<HTMLDivElement> & {
	isEmpty?: boolean;
};

export function GridBoardCell({ children, className, isEmpty, ...props }: GridBoardCellProps) {
	return (
		<div
			className={cn(
				"min-w-[280px] flex-1 flex flex-col gap-2.5 rounded-b-xl rounded-t-none bg-muted/60 border border-t-0 border-border/40 p-2.5",
				className
			)}
			{...props}
		>
			{isEmpty ? <div className="h-8" /> : children}
		</div>
	);
}

// ============================================================================
// Convenience: useGridBoard hook for accessing context in custom components
// ============================================================================

export function useGridBoard<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
>() {
	return useGridBoardContext<TItem, TColumn, TRow>();
}

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

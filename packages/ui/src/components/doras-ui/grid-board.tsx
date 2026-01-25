"use client";

import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";

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
}

export type GridBoardItemBase = {
	id: string;
	columnId: string;
	rowId?: string;
};

// ============================================================================
// Context
// ============================================================================

type GridBoardContextProps<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
> = {
	columns: TColumn[];
	rows?: TRow[];
	items: TItem[];
	getItemsForCell: (columnId: string, rowId?: string) => TItem[];
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
// GridBoardProvider - Main container with context
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
	children: ReactNode;
	className?: string;
};

export function GridBoardProvider<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
	TRow extends GridBoardRowData = GridBoardRowData,
>({ columns, rows, items, getItemsForCell, children, className }: GridBoardProviderProps<TItem, TColumn, TRow>) {
	const hasRows = rows && rows.length > 0;

	// Default implementation for getting items in a cell
	const defaultGetItemsForCell = (columnId: string, rowId?: string): TItem[] => {
		return items.filter((item) => {
			if (item.columnId !== columnId) return false;
			if (rowId !== undefined && item.rowId !== rowId) return false;
			if (rowId === undefined && hasRows && item.rowId !== undefined) return false;
			return true;
		});
	};

	const contextValue: GridBoardContextProps<TItem, TColumn, TRow> = {
		columns,
		rows,
		items,
		getItemsForCell: getItemsForCell ?? defaultGetItemsForCell,
	};

	return (
		<GridBoardContext.Provider value={contextValue as GridBoardContextProps}>
			<div className={cn("h-full overflow-auto", className)}>
				<div className="flex flex-col min-w-full w-fit">{children}</div>
			</div>
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
		<div className={cn("flex sticky top-0 z-30 overflow-hidden", className)} {...props}>
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
				"flex items-center justify-between px-3 py-2 bg-muted min-w-[280px] flex-1 gap-2 border-r border-dashed last:border-r-0",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-2">
				{column.icon && <span className={cn("text-sm", column.accentClassName)}>{column.icon}</span>}
				<span className="text-sm font-semibold">{column.label}</span>
			</div>
			<Badge variant="outline" className="text-xs h-5 px-2">
				{column.count}
			</Badge>
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
	children: (row: TRow, columns: TColumn[]) => ReactNode;
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
		<div className={className} {...props}>
			{rows.map((row) => children(row, columns))}
		</div>
	);
}

// ============================================================================
// GridBoardRowHeader - Default row header component
// ============================================================================

export type GridBoardRowHeaderProps = HTMLAttributes<HTMLDivElement> & {
	row: GridBoardRowData;
	count?: number;
};

export function GridBoardRowHeader({ row, count, className, ...props }: GridBoardRowHeaderProps) {
	const displayCount = count ?? row.count ?? 0;

	return (
		<div
			className={cn("flex items-center gap-2 py-2 px-2 bg-accent border-b sticky top-9 z-20", className)}
			{...props}
		>
			<div className="flex items-center gap-2 z-10 sticky left-2">
				{row.icon && <span className={cn("text-sm", row.accentClassName)}>{row.icon}</span>}
				<span className="text-sm font-medium whitespace-nowrap">{row.label}</span>
				<Badge variant="secondary" className="text-xs h-5 px-1.5">
					{displayCount}
				</Badge>
			</div>
		</div>
	);
}

// ============================================================================
// GridBoardCells - Renders cells for a row (or all cells if no rows)
// ============================================================================

export type GridBoardCellsProps<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	/** The row ID to get items for (undefined = no row grouping) */
	rowId?: string;
	/** Render function for each item in a cell */
	children: (item: TItem, column: TColumn, rowId?: string) => ReactNode;
	/** Render empty cell content */
	renderEmpty?: () => ReactNode;
};

export function GridBoardCells<
	TItem extends GridBoardItemBase = GridBoardItemBase,
	TColumn extends GridBoardColumnData = GridBoardColumnData,
>({ rowId, children, renderEmpty, className, ...props }: GridBoardCellsProps<TItem, TColumn>) {
	const { columns, getItemsForCell } = useGridBoardContext<TItem, TColumn>();

	const defaultRenderEmpty = () => <div className="h-8" />;
	const emptyRenderer = renderEmpty ?? defaultRenderEmpty;

	return (
		<div className={cn("flex", className)} {...props}>
			{columns.map((column) => {
				const cellItems = getItemsForCell(column.id, rowId) as TItem[];

				return (
					<div
						key={rowId ? `${column.id}-${rowId}` : column.id}
						className="min-w-[280px] flex-1 flex flex-col gap-2 border-r border-dashed last:border-r-0 p-1"
					>
						{cellItems.length > 0 ? cellItems.map((item) => children(item, column, rowId)) : emptyRenderer()}
					</div>
				);
			})}
		</div>
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
				"min-w-[280px] flex-1 flex flex-col gap-2 border-r border-dashed last:border-r-0 p-1",
				className,
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

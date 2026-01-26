"use client";

import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
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
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import {
  createContext,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
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
}

export type GridBoardItemBase = {
  id: string;
  columnId: string;
  rowId?: string;
};

/** Event data passed to onDragEnd - includes the target cell info */
export type GridBoardDragEndEvent<
  TItem extends GridBoardItemBase = GridBoardItemBase,
> = {
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
  const context = useContext(GridBoardContext) as GridBoardContextProps<
    TItem,
    TColumn,
    TRow
  > | null;
  if (!context) {
    throw new Error(
      "GridBoard components must be used within a GridBoardProvider",
    );
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

function parseCellId(
  cellId: string,
): { columnId: string; rowId?: string } | null {
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
    useSensor(KeyboardSensor),
  );

  // Default implementation for getting items in a cell
  const defaultGetItemsForCell = (
    columnId: string,
    rowId?: string,
  ): TItem[] => {
    return items.filter((item) => {
      if (item.columnId !== columnId) return false;
      if (rowId !== undefined && item.rowId !== rowId) return false;
      if (rowId === undefined && hasRows && item.rowId !== undefined)
        return false;
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
      console.log("[GridBoard] No drop target");
      return;
    }

    const itemId = active.id as string;
    const overId = over.id as string;

    console.log("[GridBoard] handleDragEnd", { itemId, overId });

    // Find the dragged item
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      console.log("[GridBoard] Item not found", { itemId });
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
      console.log("[GridBoard] Dropped on cell", { cellInfo });
    } else {
      // Dropped on an item - find which cell that item belongs to
      const overItem = items.find((i) => i.id === overId);
      if (overItem) {
        targetColumnId = overItem.columnId;
        targetRowId = overItem.rowId;
        console.log("[GridBoard] Dropped on item", {
          overItemId: overItem.id,
          targetColumnId,
          targetRowId,
        });
      }
    }

    // If we couldn't determine target, abort
    if (!targetColumnId) {
      console.log("[GridBoard] Could not determine target column");
      return;
    }

    // Check if anything actually changed
    const fromColumnId = item.columnId;
    const fromRowId = item.rowId;
    if (fromColumnId === targetColumnId && fromRowId === targetRowId) {
      console.log("[GridBoard] No change - same cell");
      return;
    }

    console.log("[GridBoard] Calling onDragEnd", {
      fromColumnId,
      fromRowId,
      toColumnId: targetColumnId,
      toRowId: targetRowId,
    });

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

  const activeItem = activeItemId
    ? items.find((i) => i.id === activeItemId)
    : null;

  return (
    <GridBoardContext.Provider
      value={contextValue as unknown as GridBoardContextProps}
    >
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
            // Kanban mode: flex layout, columns handle their own scroll
            isKanbanMode && "flex flex-col overflow-hidden",
            className,
          )}
        >
          <div
            className={cn(
              // Grid mode: column layout, fit content width
              !isKanbanMode && "flex flex-col min-w-full w-fit",
              // Kanban mode: row layout for columns, fill height
              isKanbanMode && "flex flex-col flex-1 min-h-0",
            )}
          >
            {children}
          </div>
        </div>

        {/* Drag overlay portal */}
        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
              {activeItem && renderDragOverlay ? (
                renderDragOverlay(activeItem as TItem)
              ) : (
                <t.Out />
              )}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </GridBoardContext.Provider>
  );
}

// ============================================================================
// GridBoardColumns - Renders column headers with render prop
// ============================================================================

export type GridBoardColumnsProps<
  TColumn extends GridBoardColumnData = GridBoardColumnData,
> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children: (column: TColumn) => ReactNode;
};

export function GridBoardColumns<
  TColumn extends GridBoardColumnData = GridBoardColumnData,
>({ children, className, ...props }: GridBoardColumnsProps<TColumn>) {
  const { columns } = useGridBoardContext<GridBoardItemBase, TColumn>();

  return (
    <div
      className={cn("flex sticky top-0 z-30 overflow-hidden", className)}
      {...props}
    >
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

export function GridBoardColumnHeader({
  column,
  className,
  ...props
}: GridBoardColumnHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 bg-muted min-w-[280px] flex-1 gap-2 border-r border-dashed last:border-r-0",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {column.icon && (
          <span className={cn("text-sm", column.accentClassName)}>
            {column.icon}
          </span>
        )}
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
  const { rows, columns } = useGridBoardContext<
    GridBoardItemBase,
    TColumn,
    TRow
  >();

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

export function GridBoardRowHeader({
  row,
  count,
  className,
  ...props
}: GridBoardRowHeaderProps) {
  const displayCount = count ?? row.count ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 px-2 bg-accent border-b sticky top-9 z-20",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 z-10 sticky left-2">
        {row.icon && (
          <span className={cn("text-sm", row.accentClassName)}>{row.icon}</span>
        )}
        <span className="text-sm font-medium whitespace-nowrap">
          {row.label}
        </span>
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          {displayCount}
        </Badge>
      </div>
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
  /** Render function for each item in a cell */
  children: (item: TItem, column: TColumn, rowId?: string) => ReactNode;
  /** Render empty cell content */
  renderEmpty?: () => ReactNode;
};

export function GridBoardCells<
  TItem extends GridBoardItemBase = GridBoardItemBase,
  TColumn extends GridBoardColumnData = GridBoardColumnData,
>({
  rowId,
  children,
  renderEmpty,
  className,
  ...props
}: GridBoardCellsProps<TItem, TColumn>) {
  const { columns, getItemsForCell, mode } = useGridBoardContext<
    TItem,
    TColumn
  >();
  const isKanbanMode = mode === "kanban";

  const defaultRenderEmpty = () => <div className="h-8" />;
  const emptyRenderer = renderEmpty ?? defaultRenderEmpty;

  return (
    <div
      className={cn(
        "flex",
        // Kanban mode: fill available height
        isKanbanMode && "flex-1 min-h-0",
        className,
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
          >
            <SortableContext items={cellItems.map((item) => item.id)}>
              {cellItems.length > 0
                ? cellItems.map((item) => children(item, column, rowId))
                : emptyRenderer()}
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
  children: ReactNode;
};

function GridBoardDroppableCell({
  cellId,
  isEmpty,
  isKanbanMode,
  children,
}: GridBoardDroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] flex-1 flex flex-col gap-1 border-r border-dashed last:border-r-0 p-1 transition-colors",
        isOver && "bg-primary/5 ring-1 ring-primary/20 ring-inset",
        // Grid mode: minimal height when empty
        !isKanbanMode && isEmpty && "min-h-[40px]",
        // Kanban mode: full height with independent Y scroll
        isKanbanMode && "overflow-y-auto min-h-0",
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// GridBoardItem - Draggable item wrapper
// ============================================================================

export type GridBoardItemProps<
  TItem extends GridBoardItemBase = GridBoardItemBase,
> = {
  item: TItem;
  children: ReactNode;
  className?: string;
};

export function GridBoardItem<
  TItem extends GridBoardItemBase = GridBoardItemBase,
>({ item, children, className }: GridBoardItemProps<TItem>) {
  const { activeItemId, renderDragOverlay } = useGridBoardContext<TItem>();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isDragging && "opacity-30",
          className,
        )}
      >
        {children}
      </div>
      {/* Tunnel the content to the drag overlay when this item is being dragged */}
      {activeItemId === item.id && !renderDragOverlay && (
        <t.In>{children}</t.In>
      )}
    </>
  );
}

// ============================================================================
// GridBoardCell - Individual cell wrapper (optional, for custom layouts)
// ============================================================================

export type GridBoardCellProps = HTMLAttributes<HTMLDivElement> & {
  isEmpty?: boolean;
};

export function GridBoardCell({
  children,
  className,
  isEmpty,
  ...props
}: GridBoardCellProps) {
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

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

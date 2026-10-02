import type { schema } from "@repo/database";
import {
  GridBoardCells,
  GridBoardColumnHeader,
  GridBoardColumns,
  type GridBoardDragEndEvent,
  GridBoardItem,
  GridBoardProvider,
  GridBoardRowHeader,
  GridBoardRows,
} from "@repo/ui/components/doras-ui/grid-board";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  hasMultiMembership,
  resolveEffectiveSubGrouping,
  resolveGroupingDefinition,
} from "../config/grouping-registry";
import {
  applyNestedGroupingAsColumns,
  groupTasksAsColumns,
} from "../config/groupings";
import {
  useBoardCapabilities,
  useBoardData,
  useBoardGroupings,
  useBoardRenderers,
} from "../core/board-data";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardCard } from "./board-card";
import {
  type BoardDragMutation,
  BoardDragMutationExecutor,
} from "./board-drag-actions";
import { BoardFooter } from "./board-load-more";
import { GroupHeaderContent } from "./group-header";
import {
  buildKanbanColumns,
  buildKanbanItems,
  buildKanbanRows,
  type KanbanColumnModel,
  type KanbanGridItem,
} from "./kanban-model";

interface BoardKanbanViewProps {
  tasks: readonly schema.TaskWithLabels[];
  /**
   * The host page scrolls vertically and gives the board no bounded height (e.g. the public roadmap, which
   * has a heading above and a card below it): lay the columns out at their natural height under the board's
   * single scroll area instead of giving each column its own full-height vertical scroll, which needs a
   * bounded height to resolve. Default false = the full-height kanban of /home.
   */
  pageScroll?: boolean;
}

type BoardGridItem = KanbanGridItem<schema.TaskWithLabels>;

/**
 * The default column header, plus a custom `header` (replacing the label/icon) and/or a
 * `description` / empty-state `emptyMessage` underneath when the grouping supplies them — none
 * of the built-in groupings do, so for them this is exactly GridBoardColumnHeader.
 */
function KanbanColumnHeader({ column }: { column: KanbanColumnModel }) {
  // More pages exist than are loaded, so a column's count is a lower bound ("12+").
  const partial = useBoardData().pagination?.hasMore === true;
  const note =
    column.description ??
    (column.count === 0 ? column.emptyMessage : undefined);
  if (!column.header && !note) return <GridBoardColumnHeader column={column} />;
  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-t-xl bg-background">
      {column.header ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          {column.header}
          <span className="ml-auto text-sm text-muted-foreground">
            {column.count}
            {partial ? "+" : ""}
          </span>
        </div>
      ) : (
        <GridBoardColumnHeader
          column={column}
          className="min-w-0 flex-none"
        />
      )}
      {note && (
        <div className="px-3.5 pb-2 text-xs text-muted-foreground">{note}</div>
      )}
    </div>
  );
}

export function BoardKanbanView({ tasks, pageScroll = false }: BoardKanbanViewProps) {
  const data = useBoardData();
  const groupings = useBoardGroupings();
  // Read-only boards (no drag): the grid-board's dnd is switched off and no drop is ever executed.
  const { canDrag } = useBoardCapabilities();
  const Card = useBoardRenderers().card ?? BoardCard;
  const {
    grouping,
    subGrouping: requestedSubGrouping,
    showCompletedTasks,
  } = useBoardViewState();
  // "none" when the primary grouping can't be sub-grouped.
  const subGrouping = resolveEffectiveSubGrouping(
    groupings,
    grouping,
    requestedSubGrouping,
  );
  const [mutation, setMutation] = useState<BoardDragMutation | null>(null);
  const options = useMemo(
    () => ({
      categories: data.categories,
      releases: data.releases,
      showCompletedTasks,
      groupings,
      data,
    }),
    [data, groupings, showCompletedTasks],
  );
  const groupedTasks = useMemo(
    () => applyNestedGroupingAsColumns(tasks, grouping, subGrouping, options),
    [grouping, options, subGrouping, tasks],
  );
  // Kanban has no collapse affordance (unlike list view's collapsible
  // sections) — an empty column/row is just permanent dead space with a "0"
  // badge, most visibly the "Done"/"Canceled" status columns whenever
  // showCompletedTasks hides their tasks. Drop entirely rather than render
  // empty, matching the same "don't surface empty groups" rule list view
  // applies via auto-collapse — this is the columnar equivalent of that.
  // A grouping can opt out with `keepEmptyColumns` (see kanban-model.ts).
  const columns = useMemo(
    () =>
      buildKanbanColumns(
        groupedTasks,
        resolveGroupingDefinition(groupings, grouping).keepEmptyColumns ===
          true,
      ),
    [grouping, groupedTasks, groupings],
  );
  const rows = useMemo(
    () =>
      subGrouping === "none"
        ? undefined
        : buildKanbanRows(
            groupTasksAsColumns(tasks, subGrouping, options),
            resolveGroupingDefinition(groupings, subGrouping)
              .keepEmptyColumns === true,
          ),
    [groupings, options, subGrouping, tasks],
  );
  // Kanban rows never include empty groups to begin with (filtered above), so unlike list
  // view's collapsedSections this doesn't need a "default-collapse empty groups" pass — just
  // a reset so stale ids from a previous subGrouping don't linger (e.g. a priority id that
  // happens to collide with a differently-typed group id under a different subGrouping).
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reset on subGrouping change, not read inside
  useEffect(() => {
    setCollapsedRows(new Set());
  }, [subGrouping]);
  const toggleRow = useCallback((rowId: string) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);
  // A grouping whose items can sit in several columns at once (assignee) needs cell-qualified grid ids.
  const multiMembership = hasMultiMembership(groupings, grouping, subGrouping);
  const items = useMemo<BoardGridItem[]>(
    () =>
      buildKanbanItems(groupedTasks, {
        hasSubGroups: subGrouping !== "none",
        multiMembership,
      }),
    [groupedTasks, multiMembership, subGrouping],
  );

  const handleDragEnd = (event: GridBoardDragEndEvent<BoardGridItem>) => {
    const task = tasks.find((item) => item.id === event.item.taskId);
    if (!task) return;

    setMutation({
      task,
      grouping,
      groupId: event.toColumnId,
      subGrouping,
      subGroupId: event.toRowId,
    });
  };

  return (
    <>
      <GridBoardProvider<BoardGridItem>
        columns={columns}
        {...(rows ? { rows } : {})}
        items={items}
        onDragEnd={handleDragEnd}
        disabled={!canDrag}
        // "kanban" mode gives each column independent vertical scroll, but
        // that only works when GridBoardCells is a direct flex child of the
        // provider's own flex-col container (its flex-1/min-h-0 sizing
        // depends on that). With rows/sub-grouping, GridBoardCells nests one
        // level deeper inside GridBoardRows' per-row wrapper instead, which
        // breaks that chain — columns stop scrolling and just grow the page.
        // "grid" mode sidesteps this entirely (single global scroll for the
        // whole board), matching the existing org-scoped kanban's own
        // hasKanbanSubGroups ? "grid" : "kanban" switch.
        mode={subGrouping === "none" && !pageScroll ? "kanban" : "grid"}
      >
        <GridBoardColumns className="">
          {(column: KanbanColumnModel) => (
            <KanbanColumnHeader column={column} />
          )}
        </GridBoardColumns>
        {rows ? (
          <GridBoardRows>
            {(row, _columns, isLast) => {
              const isExpanded = !collapsedRows.has(row.id);
              return (
                <div key={row.id}>
                  <GridBoardRowHeader row={row} isLast={isLast && !isExpanded}>
                    <GroupHeaderContent
                      label={row.label}
                      icon={row.icon}
                      count={row.count ?? 0}
                      toneClassName={row.toneClassName}
                      color={row.color}
                      isSubGroup
                      expanded={isExpanded}
                      onToggleExpanded={() => toggleRow(row.id)}
                    />
                  </GridBoardRowHeader>
                  {isExpanded && (
                    <GridBoardCells<BoardGridItem>
                      rowId={row.id}
                      isLast={isLast}
                    >
                      {(item) => (
                        <GridBoardItem key={item.id} item={item}>
                          <Card task={item.task} variant="kanban" />
                        </GridBoardItem>
                      )}
                    </GridBoardCells>
                  )}
                </div>
              );
            }}
          </GridBoardRows>
        ) : (
          <GridBoardCells<BoardGridItem>>
            {(item) => (
              <GridBoardItem key={item.id} item={item}>
                <Card task={item.task} variant="kanban" />
              </GridBoardItem>
            )}
          </GridBoardCells>
        )}
        {/* Under the columns, inside the board's own flex column so the columns keep their full-height
            independent scroll (an empty wrapper when there is no next page, so nothing shifts). */}
        <div className="sticky left-0 w-fit shrink-0">
          <BoardFooter />
        </div>
      </GridBoardProvider>
      {canDrag && mutation && (
        <BoardDragMutationExecutor
          mutation={mutation}
          onHandled={() => setMutation(null)}
        />
      )}
    </>
  );
}

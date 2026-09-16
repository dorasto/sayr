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
import { useMemo, useState } from "react";
import { useLanderData } from "@/contexts/ContextLander";
import { applyNestedGrouping, groupTasks } from "../config/groupings";
import { useBoardViewState } from "../filter/use-board-view-state";
import { BoardCard } from "./board-card";
import {
  type BoardDragMutation,
  BoardDragMutationExecutor,
} from "./board-drag-actions";

interface BoardKanbanViewProps {
  tasks: schema.TaskWithLabels[];
}

type BoardGridItem = {
  id: string;
  taskId: string;
  task: schema.TaskWithLabels;
  columnId: string;
  rowId?: string;
};

function getGridItemId(
  task: schema.TaskWithLabels,
  columnId: string,
  rowId: string | undefined,
  hasAssigneeGrouping: boolean,
) {
  return hasAssigneeGrouping
    ? `${task.id}:${columnId}:${rowId ?? "none"}`
    : task.id;
}

export function BoardKanbanView({ tasks }: BoardKanbanViewProps) {
  const { categories, releases } = useLanderData();
  const { grouping, subGrouping, showCompletedTasks } = useBoardViewState();
  const [mutation, setMutation] = useState<BoardDragMutation | null>(null);
  const options = useMemo(
    () => ({ categories, releases, showCompletedTasks }),
    [categories, releases, showCompletedTasks],
  );
  const groupedTasks = useMemo(
    () => applyNestedGrouping(tasks, grouping, subGrouping, options),
    [grouping, options, subGrouping, tasks],
  );
  // Kanban has no collapse affordance (unlike list view's collapsible
  // sections) — an empty column/row is just permanent dead space with a "0"
  // badge, most visibly the "Done"/"Canceled" status columns whenever
  // showCompletedTasks hides their tasks. Drop entirely rather than render
  // empty, matching the same "don't surface empty groups" rule list view
  // applies via auto-collapse — this is the columnar equivalent of that.
  const columns = useMemo(
    () =>
      groupedTasks
        .filter((group) => group.tasks.length > 0)
        .map((group) => ({
          id: group.id,
          label: group.label,
          count: group.tasks.length,
          icon: group.icon,
        })),
    [groupedTasks],
  );
  const rows = useMemo(
    () =>
      subGrouping === "none"
        ? undefined
        : groupTasks(tasks, subGrouping, options)
            .filter((group) => group.tasks.length > 0)
            .map((group) => ({
              id: group.id,
              label: group.label,
              count: group.tasks.length,
              icon: group.icon,
            })),
    [options, subGrouping, tasks],
  );
  const hasAssigneeGrouping =
    grouping === "assignee" || subGrouping === "assignee";
  const items = useMemo<BoardGridItem[]>(() => {
    if (subGrouping === "none") {
      return groupedTasks.flatMap((group) =>
        group.tasks.map((task) => ({
          id: getGridItemId(task, group.id, undefined, hasAssigneeGrouping),
          taskId: task.id,
          task,
          columnId: group.id,
        })),
      );
    }

    return groupedTasks.flatMap((group) =>
      (group.subGroups ?? []).flatMap((subGroup) =>
        subGroup.tasks.map((task) => ({
          id: getGridItemId(task, group.id, subGroup.id, hasAssigneeGrouping),
          taskId: task.id,
          task,
          columnId: group.id,
          rowId: subGroup.id,
        })),
      ),
    );
  }, [groupedTasks, hasAssigneeGrouping, subGrouping]);

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
        // "kanban" mode gives each column independent vertical scroll, but
        // that only works when GridBoardCells is a direct flex child of the
        // provider's own flex-col container (its flex-1/min-h-0 sizing
        // depends on that). With rows/sub-grouping, GridBoardCells nests one
        // level deeper inside GridBoardRows' per-row wrapper instead, which
        // breaks that chain — columns stop scrolling and just grow the page.
        // "grid" mode sidesteps this entirely (single global scroll for the
        // whole board), matching the existing org-scoped kanban's own
        // hasKanbanSubGroups ? "grid" : "kanban" switch.
        mode={subGrouping === "none" ? "kanban" : "grid"}
      >
        <GridBoardColumns className="">
          {(column) => <GridBoardColumnHeader column={column} />}
        </GridBoardColumns>
        {rows ? (
          <GridBoardRows>
            {(row) => (
              <div key={row.id}>
                <GridBoardRowHeader row={row} />
                <GridBoardCells<BoardGridItem> rowId={row.id}>
                  {(item) => (
                    <GridBoardItem key={item.id} item={item}>
                      <BoardCard task={item.task} />
                    </GridBoardItem>
                  )}
                </GridBoardCells>
              </div>
            )}
          </GridBoardRows>
        ) : (
          <GridBoardCells<BoardGridItem>>
            {(item) => (
              <GridBoardItem key={item.id} item={item}>
                <BoardCard task={item.task} />
              </GridBoardItem>
            )}
          </GridBoardCells>
        )}
      </GridBoardProvider>
      {mutation && (
        <BoardDragMutationExecutor
          mutation={mutation}
          onHandled={() => setMutation(null)}
        />
      )}
    </>
  );
}

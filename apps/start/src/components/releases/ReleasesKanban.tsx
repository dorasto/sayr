import type { schema } from "@repo/database";
import {
  GridBoardCells,
  GridBoardColumnHeader,
  GridBoardColumns,
  type GridBoardColumnData,
  type GridBoardDragEndEvent,
  GridBoardItem,
  GridBoardProvider,
} from "@repo/ui/components/doras-ui/grid-board";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useCallback } from "react";
import { updateReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { RELEASE_STATUS_ORDER, releaseStatusConfig } from "./config";
import { ReleasesKanbanCard } from "./ReleasesKanbanCard";

interface ReleasesKanbanProps {
  releases: schema.releaseType[];
  setReleases: (releases: schema.releaseType[]) => void;
  orgId: string;
}

type ReleaseStatus = schema.releaseType["status"];

type GridRelease = schema.releaseType & {
  columnId: string;
};

export function ReleasesKanban({
  releases,
  setReleases,
  orgId,
}: ReleasesKanbanProps) {
  const { runWithToast } = useToastAction();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

  // Build GridBoard columns from status order
  const gridColumns: GridBoardColumnData[] = RELEASE_STATUS_ORDER.map(
    (status) => {
      const config = releaseStatusConfig[status];
      return {
        id: `status:${status}`,
        label: config.label,
        count: releases.filter((r) => r.status === status).length,
        icon: config.icon("size-3.5"),
        accentClassName: config.className,
      };
    },
  );

  // Build grid items
  const gridItems: GridRelease[] = releases.map((r) => ({
    ...r,
    columnId: `status:${r.status}`,
  }));

  const getItemsForCell = useCallback(
    (columnId: string): GridRelease[] => {
      const status = columnId.replace("status:", "") as ReleaseStatus;
      return releases
        .filter((r) => r.status === status)
        .map((r) => ({ ...r, columnId }));
    },
    [releases],
  );

  const handleDragEnd = async (event: GridBoardDragEndEvent<GridRelease>) => {
    const { item, toColumnId } = event;
    if (!toColumnId || toColumnId === item.columnId) return;

    const newStatus = toColumnId.replace("status:", "") as ReleaseStatus;
    if (newStatus === item.status) return;

    // Determine releasedAt side-effects
    const releasedAtUpdate: { releasedAt?: Date | null } = {};
    if (newStatus === "released" && !item.releasedAt) {
      releasedAtUpdate.releasedAt = new Date();
    } else if (newStatus !== "released" && item.status === "released") {
      releasedAtUpdate.releasedAt = null;
    }

    // Optimistic update
    const updated = releases.map((r) =>
      r.id === item.id ? { ...r, status: newStatus, ...releasedAtUpdate } : r,
    );
    setReleases(updated);

    await runWithToast(
      `release-status-${item.id}`,
      {
        loading: {
          title: "Updating...",
          description: `Moving to ${releaseStatusConfig[newStatus].label}.`,
        },
        success: {
          title: "Status updated",
          description: `Release moved to ${releaseStatusConfig[newStatus].label}.`,
        },
        error: {
          title: "Failed",
          description: "Could not update release status.",
        },
      },
      () =>
        updateReleaseAction(
          orgId,
          item.id,
          { status: newStatus, ...releasedAtUpdate },
          sseClientId,
        ),
    );
  };

  const renderDragOverlay = (item: GridRelease) => (
    <div className="opacity-90 rotate-1 scale-110 w-full transition-all">
      <ReleasesKanbanCard release={item} orgId={orgId} />
    </div>
  );

  return (
    <GridBoardProvider
      columns={gridColumns}
      items={gridItems}
      getItemsForCell={getItemsForCell}
      onDragEnd={handleDragEnd}
      renderDragOverlay={renderDragOverlay}
      mode="kanban"
    >
      <GridBoardColumns>
        {(column) => <GridBoardColumnHeader key={column.id} column={column} />}
      </GridBoardColumns>
      <GridBoardCells>
        {(item: GridRelease, _column) => (
          <GridBoardItem key={item.id} item={item}>
            <ReleasesKanbanCard release={item} orgId={orgId} />
          </GridBoardItem>
        )}
      </GridBoardCells>
    </GridBoardProvider>
  );
}

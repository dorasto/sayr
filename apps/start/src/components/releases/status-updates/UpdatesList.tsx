import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconSquarePlus2,
} from "@tabler/icons-react";
import { useState } from "react";
import { type Health, type Visibility } from "./types";
import { StatusUpdateCard } from "./StatusUpdateCard";

interface UpdatesListProps {
  updates: schema.ReleaseStatusUpdateWithAuthor[];
  releaseId: string;
  orgId: string;
  sseClientId: string;
  currentUserId?: string;
  canManage: boolean;
  availableUsers: schema.UserSummary[];
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    data: Partial<{
      content: schema.NodeJSON;
      health: Health;
      visibility: Visibility;
    }>,
  ) => Promise<boolean>;
  commentsRefreshKey?: number;
  onPostUpdate?: () => void;
}

export function UpdatesList({
  updates,
  releaseId,
  orgId,
  sseClientId,
  currentUserId,
  canManage,
  availableUsers,
  onDelete,
  onEdit,
  commentsRefreshKey,
  onPostUpdate,
}: UpdatesListProps) {
  const [previousOpen, setPreviousOpen] = useState(false);
  const [latest, ...previous] = updates;

  const sharedCardProps = {
    releaseId,
    orgId,
    sseClientId,
    currentUserId,
    canManage,
    availableUsers,
    onDelete,
    onEdit,
    commentsRefreshKey,
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-3">
        <Label variant={"subheading"}>Latest update</Label>
        {canManage && onPostUpdate && (
          <Button
            variant="accent"
            className="gap-1.5 h-6 w-fit bg-transparent border-transparent px-1.5 text-xs"
            onClick={onPostUpdate}
          >
            <IconSquarePlus2 size={12} />
            Post update
          </Button>
        )}
      </div>

      {latest && (
        <div className="px-3">
          <StatusUpdateCard
            key={latest.id}
            update={latest}
            {...sharedCardProps}
          />
        </div>
      )}

      {/* Previous updates — toggle lives inside the box */}
      {previous.length > 0 && (
        <div className="flex flex-col gap-0 border-t border-border/60">
          <button
            type="button"
            onClick={() => setPreviousOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 w-full text-left"
          >
            {previousOpen ? (
              <IconChevronUp size={13} />
            ) : (
              <IconChevronDown size={13} />
            )}
            {previousOpen
              ? "Hide previous updates"
              : `${previous.length} previous update${previous.length === 1 ? "" : "s"}`}
          </button>

          {previousOpen && (
            <div className="flex flex-col gap-0 border-t border-border/60">
              <div className="px-3 pt-2 pb-1">
                <Label variant={"subheading"}>Previous updates</Label>
              </div>
              <div className="flex flex-col divide-y divide-border/40 px-3 pb-3">
                {previous.map((u) => (
                  <div key={u.id} className="pt-3 first:pt-0">
                    <StatusUpdateCard update={u} {...sharedCardProps} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom padding when no previous */}
      {previous.length === 0 && <div className="pb-1" />}
    </div>
  );
}

import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  createReleaseStatusUpdateAction,
  deleteReleaseStatusUpdateAction,
  getReleaseStatusUpdatesAction,
  updateReleaseStatusUpdateAction,
} from "@/lib/fetches/release";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutData } from "@/components/generic/Context";
import { type Health, type Visibility } from "./status-updates/types";
import { PostUpdateDialog } from "./status-updates/PostUpdateDialog";
import { UpdatesList } from "./status-updates/UpdatesList";
import processUploads from "../prosekit/upload";

interface Props {
  releaseId: string;
  orgId: string;
  currentUserId?: string;
  canManage?: boolean;
  /** Increment to trigger a refetch of status updates (e.g. on SSE event) */
  refreshKey?: number;
  /** Increment to trigger a comment refresh inside each card (e.g. on SSE comment event) */
  commentsRefreshKey?: number;
}

export function ReleaseStatusUpdatesFeed({
  releaseId,
  orgId,
  currentUserId,
  canManage = false,
  refreshKey = 0,
  commentsRefreshKey = 0,
}: Props) {
  const { organization } = useLayoutOrganization();
  const { account } = useLayoutData();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

  const [updates, setUpdates] = useState<
    schema.ReleaseStatusUpdateWithAuthor[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const availableUsers = organization.members.map(
    (m) => m.user as schema.UserSummary,
  );

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReleaseStatusUpdatesAction(orgId, releaseId);
      if (result.success) setUpdates(result.data);
    } finally {
      setLoading(false);
    }
  }, [orgId, releaseId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers a re-fetch
  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates, refreshKey]);

  const handlePost = useCallback(
    async (
      content: schema.NodeJSON,
      health: Health,
      visibility: Visibility,
    ) => {
      const updatedContent = await processUploads(
        content,
        visibility,
        orgId,
        "create-release-comment",
      );
      const result = await createReleaseStatusUpdateAction(
        orgId,
        releaseId,
        { content: updatedContent, health, visibility },
        sseClientId,
      );
      if (result.success) {
        setDialogOpen(false);
        await loadUpdates();
      }
    },
    [orgId, releaseId, sseClientId, loadUpdates],
  );

  const handleEdit = useCallback(
    async (
      id: string,
      data: Partial<{
        content: schema.NodeJSON;
        health: Health;
        visibility: Visibility;
      }>,
    ) => {
      const result = await updateReleaseStatusUpdateAction(
        orgId,
        releaseId,
        id,
        data,
        sseClientId,
      );
      if (result.success) await loadUpdates();
      return result.success;
    },
    [orgId, releaseId, sseClientId, loadUpdates],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteReleaseStatusUpdateAction(orgId, releaseId, id);
      setUpdates((prev) => prev.filter((u) => u.id !== id));
    },
    [orgId, releaseId],
  );

  // Nothing to show for non-managers when empty
  if (!loading && updates.length === 0 && !canManage) return null;

  return (
    <>
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <IconLoader2 className="animate-spin size-5 text-muted-foreground" />
          </div>
        ) : updates.length === 0 && canManage ? (
          /* Empty state CTA */
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-border/60 p-12 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer bg-transparent max-w-prose mx-auto"
          >
            <IconPencil size={14} />
            Post first status update
          </button>
        ) : updates.length > 0 ? (
          <div className="flex flex-col gap-3">
            <UpdatesList
              updates={updates}
              releaseId={releaseId}
              orgId={orgId}
              sseClientId={sseClientId}
              currentUserId={currentUserId}
              canManage={canManage}
              availableUsers={availableUsers}
              onDelete={handleDelete}
              onEdit={handleEdit}
              commentsRefreshKey={commentsRefreshKey}
              onPostUpdate={() => setDialogOpen(true)}
            />
          </div>
        ) : null}
      </div>

      <PostUpdateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={account}
        availableUsers={availableUsers}
        onPost={handlePost}
      />
    </>
  );
}

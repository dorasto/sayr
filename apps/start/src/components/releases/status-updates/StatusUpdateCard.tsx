import type { schema } from "@repo/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { formatDate, formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
  IconDots,
  IconLoader2,
  IconLock,
  IconMessage,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  createReleaseCommentAction,
  deleteReleaseCommentAction,
  getReleaseCommentsAction,
  updateReleaseCommentAction,
} from "@/lib/fetches/release";
import { InlineLabel } from "@/components/tasks/shared/inlinelabel";
import { CommentItem } from "@/components/shared/comments/CommentItem";
import { CommentInput } from "@/components/shared/comments/CommentInput";
import { ReplyThreadTrigger } from "@/components/shared/comments/ReplyThreadTrigger";
import { type Health, type Visibility, healthConfig } from "./types";
import { EditUpdateDialog } from "./EditUpdateDialog";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export interface StatusUpdateCardProps {
  update: schema.ReleaseStatusUpdateWithAuthor;
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
  /** Increment to trigger a silent comment refresh (from SSE) */
  commentsRefreshKey?: number;
}

export function StatusUpdateCard({
  update,
  releaseId,
  orgId,
  sseClientId,
  currentUserId,
  canManage,
  availableUsers,
  onDelete,
  onEdit,
  commentsRefreshKey = 0,
}: StatusUpdateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<schema.ReleaseCommentWithAuthor[]>(
    [],
  );
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  // Seed from server-provided count so the trigger renders immediately
  const [knownCount, setKnownCount] = useState(update.commentCount ?? 0);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const result = await getReleaseCommentsAction(
        orgId,
        releaseId,
        update.id,
      );
      if (result.success) {
        setComments(result.data);
        setKnownCount(result.data.length);
        setCommentsLoaded(true);
      }
    } finally {
      setCommentsLoading(false);
    }
  }, [orgId, releaseId, update.id]);

  const handleToggleComments = useCallback(async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded) await loadComments();
  }, [commentsOpen, commentsLoaded, loadComments]);

  // Only refresh via SSE if the thread has already been opened — avoids eager
  // fetching all cards on mount which would saturate the connection pool.
  // biome-ignore lint/correctness/useExhaustiveDependencies: commentsRefreshKey intentionally triggers a re-fetch
  useEffect(() => {
    if (commentsRefreshKey > 0 && commentsLoaded) void loadComments();
  }, [commentsRefreshKey]);

  const handleSaveEdit = useCallback(
    async (data: {
      content: schema.NodeJSON | undefined;
      health: Health;
      visibility: Visibility;
    }) => {
      const success = await onEdit(update.id, {
        content: data.content,
        health: data.health,
        visibility: data.visibility,
      });
      if (success) setIsEditing(false);
      return success;
    },
    [onEdit, update.id],
  );

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    onDelete(update.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  }, [onDelete, update.id]);

  const handleEditComment = useCallback(
    async (commentId: string, content: schema.NodeJSON) => {
      const result = await updateReleaseCommentAction(
        orgId,
        releaseId,
        commentId,
        { content },
        sseClientId,
      );
      if (result.success) await loadComments();
      return result.success;
    },
    [orgId, releaseId, sseClientId, loadComments],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const result = await deleteReleaseCommentAction(
        orgId,
        releaseId,
        commentId,
      );
      if (result.success) await loadComments();
      return result.success;
    },
    [orgId, releaseId, loadComments],
  );

  const handlePostComment = useCallback(
    async (content: schema.NodeJSON, visibility: "public" | "internal") => {
      const result = await createReleaseCommentAction(
        orgId,
        releaseId,
        { content, visibility, statusUpdateId: update.id },
        sseClientId,
      );
      if (result.success) await loadComments();
      return result.success;
    },
    [orgId, releaseId, update.id, sseClientId, loadComments],
  );

  const isOwn = !!currentUserId && update.author?.id === currentUserId;
  const health = healthConfig[update.health as Health] ?? healthConfig.on_track;
  const authorName = update.author ? getDisplayName(update.author) : "Unknown";

  // Use live-loaded comment authors when available, fall back to server-seeded preview
  const previewAuthors = commentsLoaded
    ? Array.from(
        new Map(
          comments
            .map((c) => [c.createdBy?.id, c.createdBy])
            .filter((e): e is [string, schema.UserSummary] => !!e[1]),
        ).values(),
      ).slice(0, 3)
    : (update.commentAuthors ?? []);

  return (
    <>
      <div className="rounded-xl border bg-accent relative overflow-hidden p-2 group/update flex flex-col gap-3">
        {/* Badges + action buttons row */}
        <div className="flex items-center gap-3">
          <ReadonlyBadges
            health={health}
            visibility={update.visibility as Visibility}
          />
          {update.createdAt && (
            <Label variant="description" className="">
              {formatDateTimeFromNow(update.createdAt)} (
              {formatDate(update.createdAt)})
            </Label>
          )}
          <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/update:opacity-100 has-data-[state=open]:opacity-100 transition-all">
            <Button
              variant="ghost"
              size="icon"
              className="p-1 h-auto w-auto aspect-square"
              onClick={handleToggleComments}
            >
              <IconMessage size={16} />
            </Button>
            {(isOwn || canManage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent"
                  >
                    <IconDots size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                    <IconPencil size={16} /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash size={16} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Author + timestamp */}
        <div className="flex items-center gap-3">
          <InlineLabel
            text={authorName}
            image={update.author?.image ?? ""}
            avatarClassName="size-5!"
            className="ps-7"
          />
        </div>

        {/* Content (readonly) */}
        {update.content && (
          <Suspense
            fallback={
              <div className="h-4 animate-pulse bg-muted rounded w-3/4" />
            }
          >
            <Editor
              readonly
              defaultContent={update.content as schema.NodeJSON}
              hideBlockHandle
              mentionViewUsers={availableUsers}
              className="pl-1"
            />
          </Suspense>
        )}

        {/* Comment thread trigger */}
        {!isEditing && knownCount > 0 && (
          <ReplyThreadTrigger
            count={knownCount}
            replyAuthors={previewAuthors}
            isInternal={update.visibility === "internal"}
            expanded={commentsOpen}
            onClick={handleToggleComments}
          />
        )}

        {/* Inline comment thread */}
        {!isEditing && commentsOpen && (
          <div
            className={cn(
              "border-t mt-2",
              update.visibility === "internal"
                ? "border-primary/20"
                : "border-border",
            )}
          >
            {commentsLoading ? (
              <div className="flex items-center justify-center py-3">
                <IconLoader2 className="animate-spin size-4 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    availableUsers={availableUsers}
                    isOwn={!!currentUserId && c.createdBy?.id === currentUserId}
                    canManage={canManage}
                    onEdit={handleEditComment}
                    onDelete={handleDeleteComment}
                  />
                ))}
              </div>
            )}
            <CommentInput
              availableUsers={availableUsers}
              onPost={handlePostComment}
            />
          </div>
        )}
      </div>

      <EditUpdateDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        availableUsers={availableUsers}
        initialContent={update.content as schema.NodeJSON | undefined}
        initialHealth={update.health as Health}
        initialVisibility={update.visibility as Visibility}
        onSave={handleSaveEdit}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function ReadonlyBadges({
  health,
  visibility,
}: {
  health: (typeof healthConfig)[Health];
  visibility: Visibility;
}) {
  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          "gap-1 text-xs border pointer-events-none w-fit",
          health.className,
        )}
      >
        {health.icon} {health.label}
      </Badge>
      {visibility === "internal" && (
        <Badge variant="outline" className="gap-1 text-xs pointer-events-none">
          <IconLock size={12} /> Internal
        </Badge>
      )}
    </>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle asChild>
            <Label variant="heading">Delete status update?</Label>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the status update and its comments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <IconLoader2 className="animate-spin size-4" />
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
  IconArrowRight,
  IconDots,
  IconEye,
  IconEyeOff,
  IconHistory,
  IconLock,
  IconLockOpen2,
  IconMessageDots,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { processUploadsAndDeletions } from "@/components/prosekit/upload";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import {
  CreateTaskReactionAction,
  DeleteTaskCommentAction,
  UpdateCommentVisibilityAction,
  UpdateTaskCommentAction,
} from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import { ReactionPicker, type ReactionEmoji } from "./reactions";
import type { TimelineItemProps } from "./types";

function CommentHistoryDialog({
  orgId,
  taskId,
  commentId,
  visibility,
  tasks,
  categories,
  availableUsers,
  open,
  onOpenChange,
}: {
  orgId: string;
  taskId: string;
  commentId: string;
  visibility: "public" | "internal";
  tasks?: schema.TaskWithLabels[];
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [history, setHistory] = useState<schema.taskCommentHistoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!open) return;
      setLoading(true);
      setError(null);

      try {
        const url = `${import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal"}/v1/admin/organization/task/get-comment-history?org_id=${orgId}&task_id=${taskId}&comment_id=${commentId}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch comment history");
        const data = await res.json();
        setHistory(data.success && Array.isArray(data.data) ? data.data : []);
      } catch (err: unknown) {
        console.error(err);
        setError(
          (err as Error).message || "An error occurred while fetching history.",
        );
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [open, orgId, taskId, commentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="p-3 border-b">
          <DialogTitle asChild>
            <Label variant={"heading"}>Comment History</Label>
          </DialogTitle>
          <DialogDescription asChild>
            <Label variant={"description"}>
              Previous versions of this comment.
            </Label>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading…
            </p>
          )}

          {error && <p className="text-sm text-destructive">Error: {error}</p>}

          {!loading && !error && history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history found.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {history.length} edits
            </p>
          )}

          {!loading &&
            !error &&
            history.map((entry) => {
              const actor = availableUsers?.find(
                (user) => user.id === entry.editedBy,
              );
              return (
                <Collapsible
                  key={entry.id}
                  className="data-[state=open]:bg-accent p-2 rounded-lg hover:bg-accent"
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 w-full data-[state=open]:[&_svg]:rotate-90">
                      <InlineLabel
                        text={actor?.name || ""}
                        textNode={
                          <InlineLabel
                            text={actor?.name || ""}
                            image={actor?.image}
                          />
                        }
                        icon={
                          <IconArrowRight className="size-3 transition-all text-foreground" />
                        }
                      />
                      <Label variant={"description"}> - 9 minutes ago</Label>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <TimelineItemWrapper
                      item={{
                        id: entry.id,
                        organizationId: entry.organizationId,
                        taskId: entry.taskId || "",
                        createdAt: entry.editedAt,
                        updatedAt: entry.editedAt,
                        eventType: "comment",
                        actor,
                        content: entry.content,
                        visibility,
                        toValue: "",
                        fromValue: "",
                        actorId: entry.editedBy,
                      }}
                      icon={IconMessageDots}
                      color="bg-accent text-primary-foreground"
                      variant="comment"
                      availableUsers={availableUsers || []}
                      categories={categories || []}
                      tasks={tasks || []}
                    />
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommentActionsMenu({
  showHistory,
  onEdit,
  onViewHistory,
  onDelete,
  onToggleVisibility,
  visibility,
  canManageComment,
}: {
  showHistory: boolean;
  onEdit: () => void;
  onViewHistory: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  visibility: "public" | "internal";
  canManageComment: boolean;
}) {
  return (
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
        <DropdownMenuItem onSelect={onEdit}>
          <IconPencil size={16} />
          Edit
        </DropdownMenuItem>
        {showHistory ? (
          <DropdownMenuItem onSelect={onViewHistory}>
            <IconHistory size={16} />
            See edits
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <IconHistory size={16} />
            No edit history
          </DropdownMenuItem>
        )}
        {canManageComment && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggleVisibility}>
              {visibility === "public" ? (
                <>
                  <IconLock size={16} />
                  Make internal
                </>
              ) : (
                <>
                  <IconLockOpen2 size={16} />
                  Make public
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash size={16} />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TimelineComment({
  item,
  availableUsers,
  categories,
  tasks,
  showSeparator = true,
}: TimelineItemProps & { showSeparator?: boolean }) {
  const queryClient = useQueryClient();
  const { organization } = useLayoutOrganization();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast, isFetching } = useToastAction();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<NodeJSON | undefined>(
    item.content as NodeJSON | undefined,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);

  const showHistory =
    item.createdAt && item.updatedAt && item.createdAt !== item.updatedAt;

  const oldCommentText = extractTextContent(item.content);
  const newCommentText = extractTextContent(editedContent);
  const canSave =
    newCommentText.trim().length > 0 && oldCommentText !== newCommentText;

  const task = tasks?.find((t) => t.id === item.taskId);
  const { value: account } = useStateManagement<schema.userType>(
    "account",
    null,
  );

  // Calculate if user can manage this comment (delete or change visibility)
  // User can manage if they are the comment author OR have admin.administrator OR moderation.manageComments permission
  // We show the options optimistically to logged-in members - the backend will enforce actual permissions
  const canManageComment = useMemo(() => {
    if (!account?.id) return false;

    // Check if user is the comment author (compare both id and name for safety)
    const isAuthor = item.actor?.id === account.id;
    if (isAuthor) return true;

    // For non-authors, check if user is a member of the organization
    // If they are a member, show the options - backend will enforce actual permissions
    // This handles the case where we don't have team permissions loaded client-side
    const isMember = organization?.members?.some(
      (m) => m.user?.id === account.id,
    );
    return !!isMember;
  }, [account?.id, item.actor?.id, organization?.members]);

  async function handleSave() {
    if (!editedContent || !canSave || !task) {
      headlessToast.error({
        title: "Cannot update comment",
        description:
          "Please make sure there is content before updating this comment.",
        id: "update-task-comment",
      });
      return;
    }

    const processed = await processUploadsAndDeletions(
      item.content as NodeJSON,
      editedContent,
      item.visibility,
      item.organizationId,
      "update-task-comment",
    );

    const data = await runWithToast(
      "update-task-comment",
      {
        loading: {
          title: "Updating comment...",
          description: "Saving your changes.",
        },
        success: {
          title: "Comment updated",
          description: "Your edits were saved successfully.",
        },
        error: {
          title: "Couldn't update comment",
          description:
            "The comment appears locally but could not be updated on the server.",
        },
      },
      () =>
        UpdateTaskCommentAction(
          item.organizationId,
          task.id,
          item.id,
          processed,
          item.visibility,
          wsClientId,
        ),
    );

    if (data?.success) {
      setIsEditing(false);
      queryClient.invalidateQueries({
        queryKey: ["timeline", "comments", item.taskId, item.organizationId],
      });
    }
  }

  function handleCancel() {
    setEditedContent(item.content as NodeJSON | undefined);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!task) return;

    const data = await runWithToast(
      "delete-task-comment",
      {
        loading: {
          title: "Deleting comment...",
          description: "Removing this comment.",
        },
        success: {
          title: "Comment deleted",
          description: "The comment has been removed.",
        },
        error: {
          title: "Couldn't delete comment",
          description: "Failed to delete the comment. Please try again.",
        },
      },
      () =>
        DeleteTaskCommentAction(
          item.organizationId,
          task.id,
          item.id,
          wsClientId,
        ),
    );

    if (data?.success) {
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["timeline", "comments", item.taskId, item.organizationId],
      });
    }
  }

  async function handleToggleVisibility() {
    if (!task) return;

    const newVisibility = item.visibility === "public" ? "internal" : "public";

    const data = await runWithToast(
      "update-comment-visibility",
      {
        loading: {
          title: "Updating visibility...",
          description: `Making comment ${newVisibility}.`,
        },
        success: {
          title: "Visibility updated",
          description: `Comment is now ${newVisibility}.`,
        },
        error: {
          title: "Couldn't update visibility",
          description: "Failed to change visibility. Please try again.",
        },
      },
      () =>
        UpdateCommentVisibilityAction(
          item.organizationId,
          task.id,
          item.id,
          newVisibility,
          wsClientId,
        ),
    );

    if (data?.success) {
      setVisibilityDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["timeline", "comments", item.taskId, item.organizationId],
      });
    }
  }

  type CommentsPageData = {
    data: schema.taskTimelineWithActor[];
    pagination?: {
      pageFromStart: number;
      pageFromEnd: number;
      totalPages: number;
      hasMore: boolean;
    };
  };

  const handleToggleReaction = useCallback(
    async (commentId: string, emoji: ReactionEmoji) => {
      if (!account?.id) return;

      const queryKey = [
        "timeline",
        "comments",
        item.taskId,
        item.organizationId,
      ];
      const userId = account.id;

      const previousData =
        queryClient.getQueryData<InfiniteData<CommentsPageData>>(queryKey);

      queryClient.setQueryData<InfiniteData<CommentsPageData>>(
        queryKey,
        (old) => {
          if (!old) return old;

          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((comment) => {
                if (comment.id !== commentId) return comment;

                const currentReactions = comment.reactions?.reactions ?? {};
                const emojiData = currentReactions[emoji] ?? {
                  count: 0,
                  users: [],
                };
                const hasReacted = emojiData.users.includes(userId);

                let updatedEmojiData: { count: number; users: string[] };
                if (hasReacted) {
                  updatedEmojiData = {
                    count: Math.max(0, emojiData.count - 1),
                    users: emojiData.users.filter((id) => id !== userId),
                  };
                } else {
                  updatedEmojiData = {
                    count: emojiData.count + 1,
                    users: [...emojiData.users, userId],
                  };
                }

                const newReactions = { ...currentReactions };
                if (updatedEmojiData.count === 0) {
                  delete newReactions[emoji];
                } else {
                  newReactions[emoji] = updatedEmojiData;
                }

                const total = Object.values(newReactions).reduce(
                  (sum, r) => sum + r.count,
                  0,
                );

                return {
                  ...comment,
                  reactions:
                    total > 0
                      ? { commentId, total, reactions: newReactions }
                      : undefined,
                };
              }),
            })),
          };
        },
      );

      try {
        await CreateTaskReactionAction(
          item.organizationId,
          item.taskId,
          commentId,
          emoji,
          wsClientId,
        );
      } catch {
        queryClient.setQueryData(queryKey, previousData);
        headlessToast.error({
          title: "Reaction failed",
          description: "Could not update your reaction. Please try again.",
          id: "reaction-error",
        });
      }
    },
    [account?.id, item.taskId, item.organizationId, queryClient, wsClientId],
  );

  return (
    <>
      <TimelineItemWrapper
        showSeparator={showSeparator}
        item={item}
        availableUsers={availableUsers || []}
        categories={categories || []}
        tasks={tasks || []}
        icon={IconMessageDots}
        color="bg-accent text-primary-foreground"
        variant="comment"
        isEditing={isEditing}
        onContentChange={setEditedContent}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isFetching}
        canSave={canSave}
        onReactionToggle={(e) => handleToggleReaction(item.id, e)}
        actionButtons={
          !isEditing ? (
            <>
              <ReactionPicker
                onSelect={(e) => handleToggleReaction(item.id, e)}
                existingReactions={
                  account?.id
                    ? (Object.entries(item.reactions?.reactions ?? {})
                        .filter(([, data]) => data.users.includes(account.id))
                        .map(([emoji]) => emoji) as ReactionEmoji[])
                    : []
                }
              />
              <CommentActionsMenu
                showHistory={!!showHistory}
                onEdit={() => setIsEditing(true)}
                onViewHistory={() => setHistoryOpen(true)}
                onDelete={() => setDeleteDialogOpen(true)}
                onToggleVisibility={() => setVisibilityDialogOpen(true)}
                visibility={item.visibility}
                canManageComment={canManageComment}
              />
            </>
          ) : undefined
        }
      />

      {showHistory && (
        <CommentHistoryDialog
          commentId={item.id}
          orgId={item.organizationId}
          taskId={item.taskId ?? ""}
          availableUsers={availableUsers}
          categories={categories}
          tasks={tasks}
          visibility={item.visibility}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Label variant={"heading"}>Delete comment?</Label>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              comment and all of its edit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visibility Change Confirmation Dialog */}
      <AlertDialog
        open={visibilityDialogOpen}
        onOpenChange={setVisibilityDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Label variant={"heading"}>
                Change to {item.visibility === "public" ? "internal" : "public"}
              </Label>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {item.visibility === "public"
                ? "This comment will only be visible to organization members and will be hidden from the public."
                : "This comment will become visible to everyone on the public. If the task itself is set to private, it will not be visible to anyone except organization members."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleVisibility}>
              Make {item.visibility === "public" ? "internal" : "public"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

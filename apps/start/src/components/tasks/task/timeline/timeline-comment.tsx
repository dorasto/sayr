import type { schema } from "@repo/database";
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
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Label } from "@repo/ui/components/label";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import {
  IconArrowRight,
  IconDots,
  IconHistory,
  IconMessageDots,
  IconPencil,
} from "@tabler/icons-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useEffect, useState } from "react";
import { processUploadsAndDeletions } from "@/components/prosekit/upload";
import {
  CreateTaskReactionAction,
  UpdateTaskCommentAction,
} from "@/lib/fetches/task";
import { extractTextContent, useToastAction } from "@/lib/util";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import { ReactionPicker, type ReactionEmoji } from "./reactions";
import type { TimelineItemProps } from "./types";

// --------------------
// CommentHistoryDialog
// --------------------
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
        const url = `${import.meta.env.VITE_APP_ENV === "development" ? import.meta.env.VITE_EXTERNAL_API_URL : "/api"}/admin/organization/task/get-comment-history?org_id=${orgId}&task_id=${taskId}&comment_id=${commentId}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch comment history");
        const data = await res.json();
        setHistory(data.success && Array.isArray(data.data) ? data.data : []);
        // biome-ignore lint/suspicious/noExplicitAny: <error>
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while fetching history.");
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

        {/* Scrollable content area */}
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

// --------------------
// CommentActionsMenu
// --------------------
function CommentActionsMenu({
  showHistory,
  onEdit,
  onViewHistory,
}: {
  showHistory: boolean;
  onEdit: () => void;
  onViewHistory: () => void;
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --------------------
// TimelineComment
// --------------------
export function TimelineComment({
  item,
  availableUsers,
  categories,
  tasks,
}: TimelineItemProps) {
  const queryClient = useQueryClient();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const { runWithToast, isFetching } = useToastAction();

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<NodeJSON | undefined>(
    item.content as NodeJSON | undefined,
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  const showHistory =
    item.createdAt && item.updatedAt && item.createdAt !== item.updatedAt;

  const oldCommentText = extractTextContent(item.content);
  const newCommentText = extractTextContent(editedContent);
  const canSave =
    newCommentText.trim().length > 0 && oldCommentText !== newCommentText;

  const task = tasks?.find((t) => t.id === item.taskId);

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
  const { value: account } = useStateManagement<schema.userType>(
    "account",
    null,
  );

  // Type for the infinite query data structure
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

      // Snapshot the previous data for rollback
      const previousData =
        queryClient.getQueryData<InfiniteData<CommentsPageData>>(queryKey);

      // Optimistically update the cache
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
                  // Remove reaction
                  updatedEmojiData = {
                    count: Math.max(0, emojiData.count - 1),
                    users: emojiData.users.filter((id) => id !== userId),
                  };
                } else {
                  // Add reaction
                  updatedEmojiData = {
                    count: emojiData.count + 1,
                    users: [...emojiData.users, userId],
                  };
                }

                // Build new reactions object, removing emoji if count is 0
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

      // Fire the API call in the background
      try {
        await CreateTaskReactionAction(
          item.organizationId,
          item.taskId,
          commentId,
          emoji,
          wsClientId,
        );
        // Optionally invalidate to sync with server (for other clients' reactions)
        // Uncomment if you want to ensure full sync after each reaction:
        // queryClient.invalidateQueries({ queryKey });
      } catch {
        // Rollback on error
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
    </>
  );
}

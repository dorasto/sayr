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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
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
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import {
  IconChevronDown,
  IconDots,
  IconLoader2,
  IconMessage,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addReleaseCommentReactionAction,
  createReleaseCommentAction,
  deleteReleaseCommentAction,
  getReleaseCommentRepliesAction,
  getReleaseCommentsAction,
  removeReleaseCommentReactionAction,
  updateReleaseCommentAction,
} from "@/lib/fetches/release";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { CommentItem } from "@/components/shared/comments/CommentItem";
import { CommentInput } from "@/components/shared/comments/CommentInput";
import { ReplyThreadTrigger } from "@/components/shared/comments/ReplyThreadTrigger";
import {
  ReactionDisplay,
  ReactionPicker,
  type ReactionEmoji,
} from "@/components/tasks/task/timeline/reactions";
import processUploads from "../prosekit/upload";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const PAGE_SIZE = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyOptimisticReaction(
  comment: schema.ReleaseCommentWithAuthor,
  commentId: string,
  emoji: ReactionEmoji,
  userId: string,
): schema.ReleaseCommentWithAuthor {
  if (comment.id !== commentId) return comment;

  const current = comment.reactions?.reactions ?? {};
  const emojiData = current[emoji] ?? { count: 0, users: [] };
  const hasReacted = emojiData.users.includes(userId);

  const updated = hasReacted
    ? {
      count: Math.max(0, emojiData.count - 1),
      users: emojiData.users.filter((id) => id !== userId),
    }
    : { count: emojiData.count + 1, users: [...emojiData.users, userId] };

  const newReactions = { ...current };
  if (updated.count === 0) {
    delete newReactions[emoji];
  } else {
    newReactions[emoji] = updated;
  }

  const total = Object.values(newReactions).reduce(
    (sum, r) => sum + r.count,
    0,
  );

  return {
    ...comment,
    reactions:
      total > 0
        ? { total, reactions: newReactions }
        : { total: 0, reactions: {} },
  };
}

function applyOptimisticCommentCreate(
  list: schema.ReleaseCommentWithAuthor[],
  newComment: schema.ReleaseCommentWithAuthor,
): schema.ReleaseCommentWithAuthor[] {
  if (newComment.parentId) {
    return [
      ...list.map((c) =>
        c.id === newComment.parentId
          ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
          : c,
      ),
      newComment,
    ];
  }
  return [...list, newComment];
}

function applyOptimisticCommentUpdate(
  list: schema.ReleaseCommentWithAuthor[],
  commentId: string,
  updates: Partial<schema.ReleaseCommentWithAuthor>,
): schema.ReleaseCommentWithAuthor[] {
  return list.map((c) => (c.id === commentId ? { ...c, ...updates } : c));
}

function applyOptimisticCommentDelete(
  list: schema.ReleaseCommentWithAuthor[],
  commentId: string,
): schema.ReleaseCommentWithAuthor[] {
  const target = list.find((c) => c.id === commentId);
  if (target?.parentId) {
    return list.map((c) =>
      c.id === target.parentId
        ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }
        : c,
    );
  }
  return list.filter((c) => c.id !== commentId);
}

// ---------------------------------------------------------------------------
// TopLevelCommentCard
// ---------------------------------------------------------------------------
interface TopLevelCommentCardProps {
  comment: schema.ReleaseCommentWithAuthor;
  replies: schema.ReleaseCommentWithAuthor[];
  onLoadReplies: () => Promise<void>;
  repliesLoading: boolean;
  availableUsers: schema.UserSummary[];
  currentUserId?: string;
  canManage: boolean;
  orgId: string;
  releaseId: string;
  sseClientId: string;
  onReactionToggle: (commentId: string, emoji: ReactionEmoji) => void;
  onReplyReactionToggle: (replyId: string, emoji: ReactionEmoji) => void;
  onPostReply: (
    parentId: string,
    content: schema.NodeJSON,
    visibility: "public" | "internal",
  ) => Promise<boolean>;
  onEditReply: (replyId: string, content: schema.NodeJSON) => Promise<boolean>;
  onDeleteReply: (replyId: string) => Promise<boolean>;
  onEditComment: (
    commentId: string,
    content: schema.NodeJSON,
  ) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
}

function TopLevelCommentCard({
  comment,
  replies,
  onLoadReplies,
  repliesLoading,
  availableUsers,
  currentUserId,
  canManage,
  onReactionToggle,
  onReplyReactionToggle,
  onPostReply,
  onEditReply,
  onDeleteReply,
  onEditComment,
  onDeleteComment,
}: TopLevelCommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(
    comment.content as schema.NodeJSON | undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyInputVisibility, setReplyInputVisibility] = useState<
    "public" | "internal"
  >("public");

  const authorName = comment.createdBy
    ? getDisplayName(comment.createdBy)
    : "Unknown";
  const isOwn = !!currentUserId && comment.createdBy?.id === currentUserId;

  const replyAuthors: schema.UserSummary[] = Array.from(
    new Map(
      replies
        .map((r) => [r.createdBy?.id, r.createdBy])
        .filter((e): e is [string, schema.UserSummary] => !!e[1]),
    ).values(),
  ).slice(0, 3);

  const existingReactions: ReactionEmoji[] = currentUserId
    ? (Object.entries(comment.reactions?.reactions ?? {})
      .filter(([, data]) => data.users.includes(currentUserId))
      .map(([emoji]) => emoji) as ReactionEmoji[])
    : [];

  const handleSave = useCallback(async () => {
    if (!editContent) return;
    setIsSaving(true);
    const success = await onEditComment(comment.id, editContent);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  }, [editContent, comment.id, onEditComment]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDeleteComment(comment.id);
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  }, [comment.id, onDeleteComment]);

  const handlePostReplyLocal = useCallback(
    async (content: schema.NodeJSON, visibility: "public" | "internal") => {
      return onPostReply(comment.id, content, visibility);
    },
    [comment.id, onPostReply],
  );

  const handleEditReplyLocal = useCallback(
    async (replyId: string, content: schema.NodeJSON) => {
      return onEditReply(replyId, content);
    },
    [onEditReply],
  );

  const handleDeleteReplyLocal = useCallback(
    async (replyId: string) => {
      return onDeleteReply(replyId);
    },
    [onDeleteReply],
  );

  return (
    <>
      <div
        className={cn(
          "border bg-card relative overflow-hidden group/comment rounded-xl px-3",
          comment.visibility === "internal" &&
          "bg-internal border-internal-border",
        )}
      >
        {/* Header + content */}
        <div className="pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar className="size-5 shrink-0 rounded-full">
              <AvatarImage
                src={comment.createdBy?.image ?? ""}
                alt={authorName}
              />
              <AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
                {authorName.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{authorName}</span>
            {comment.createdAt && (
              <span className="text-xs text-muted-foreground">
                {formatDateTimeFromNow(comment.createdAt)}
              </span>
            )}

            {/* Action bar — hover-revealed */}
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 has-data-[state=open]:opacity-100 transition-all">
              {!isEditing && (
                <>
                  <ReactionPicker
                    onSelect={(e) => onReactionToggle(comment.id, e)}
                    existingReactions={existingReactions}
                  />
                  {/* Reply toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 h-auto w-auto aspect-square"
                    onClick={() => {
                      setShowReplies((v) => !v);
                      if (
                        !showReplies &&
                        comment.replyCount &&
                        comment.replyCount > 0
                      ) {
                        void onLoadReplies();
                      }
                    }}
                    title="Reply"
                  >
                    <IconMessage size={14} />
                  </Button>
                  {(isOwn || canManage) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <IconDots size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isOwn && (
                          <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                            <IconPencil size={14} /> Edit
                          </DropdownMenuItem>
                        )}
                        {isOwn && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onSelect={() => setDeleteDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <IconTrash size={14} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Content / editor */}
          {isEditing ? (
            <div className="mt-2">
              <Suspense
                fallback={
                  <div className="h-16 animate-pulse bg-muted rounded" />
                }
              >
                <Editor
                  defaultContent={
                    comment.content as schema.NodeJSON | undefined
                  }
                  onChange={setEditContent}
                  hideBlockHandle
                  mentionViewUsers={availableUsers}
                />
              </Suspense>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving && (
                    <IconLoader2 size={14} className="animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            comment.content && (
              <Suspense
                fallback={
                  <div className="h-4 animate-pulse bg-muted rounded w-3/4 mt-1" />
                }
              >
                <Editor
                  readonly
                  defaultContent={
                    comment.content as schema.NodeJSON | undefined
                  }
                  hideBlockHandle
                  mentionViewUsers={availableUsers}
                />
              </Suspense>
            )
          )}

          {/* Reaction display */}
          {!isEditing && (comment.reactions?.total ?? 0) > 0 && (
            <div className="">
              <ReactionDisplay
                reactions={comment.reactions?.reactions}
                toggleReaction={(e) => onReactionToggle(comment.id, e)}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>

        {/* Reply thread trigger */}
        {!showReplies && (
          <div className="pb-2">
            <ReplyThreadTrigger
              count={comment.replyCount ?? replies.length}
              replyAuthors={replyAuthors}
              isInternal={comment.visibility === "internal"}
              onClick={() => {
                setShowReplies(true);
                if (comment.replyCount && comment.replyCount > 0) {
                  void onLoadReplies();
                }
              }}
              className="px-0!"
            />
          </div>
        )}

        {/* Expanded reply thread */}
        {showReplies && (
          <>
            {repliesLoading ? (
              <div className="flex items-center justify-center py-4">
                <IconLoader2 className="animate-spin size-4 text-muted-foreground" />
              </div>
            ) : replies.length > 0 ? (
              <>
                <div className="">
                  <ReplyThreadTrigger
                    count={replies.length}
                    replyAuthors={replyAuthors}
                    isInternal={comment.visibility === "internal"}
                    expanded
                    onClick={() => setShowReplies(false)}
                  />
                </div>
                <div
                  className={cn(
                    "flex flex-col mt-1 border rounded-xl overflow-hidden",
                    replies.some((r) => r.visibility === "internal") &&
                    "border-internal-border",
                  )}
                >
                  {replies.map((reply, index) => (
                    <div
                      key={reply.id}
                      className={cn(
                        "px-3",
                        reply.visibility === "internal"
                          ? "bg-internal"
                          : "bg-card",
                        index < replies.length - 1 && "border-b border-border",
                        index < replies.length - 1 &&
                          reply.visibility === "internal"
                          ? "border-internal-border"
                          : undefined,
                      )}
                    >
                      <CommentItem
                        comment={reply}
                        availableUsers={availableUsers}
                        isOwn={
                          !!currentUserId &&
                          reply.createdBy?.id === currentUserId
                        }
                        canManage={canManage}
                        currentUserId={currentUserId}
                        onEdit={handleEditReplyLocal}
                        onDelete={handleDeleteReplyLocal}
                        onReactionToggle={onReplyReactionToggle}
                        className="rounded-none border-0"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-4">
                <IconLoader2 className="animate-spin size-4 text-muted-foreground" />
              </div>
            )}

            <div
              className={cn(
                "rounded-xl mb-3 mt-1",
                replyInputVisibility === "internal"
                  ? "bg-internal border border-internal-border"
                  : "bg-card border border-border",
              )}
            >
              <CommentInput
                availableUsers={availableUsers}
                placeholder="Reply..."
                onPost={handlePostReplyLocal}
                onVisibilityChange={setReplyInputVisibility}
              />
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle asChild>
              <Label variant="heading">Delete comment?</Label>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  releaseId: string;
  orgId: string;
  currentUserId?: string;
  canComment?: boolean;
  canManage?: boolean;
  refreshKey?: number;
  onRegisterRefresh?: (refreshFn: () => Promise<void>) => void;
}

export function ReleaseDiscussion({
  releaseId,
  orgId,
  currentUserId,
  canComment = true,
  canManage = false,
  refreshKey = 0,
  onRegisterRefresh,
}: Props) {
  const { organization } = useLayoutOrganization();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

  const availableUsers = organization.members.map(
    (m) => m.user as schema.UserSummary,
  );

  // ── Pagination state (converging pointer pattern) ─────────────────────────
  const [allComments, setAllComments] = useState<
    schema.ReleaseCommentWithAuthor[]
  >([]);
  const [pageFromStart, setPageFromStart] = useState(1);
  const [pageFromEnd, setPageFromEnd] = useState<number | null>(null);
  const [_totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mainInputVisibility, setMainInputVisibility] = useState<
    "public" | "internal"
  >("public");

  // Tracks the refreshKey that was last used so we know when to reset
  const prevRefreshKey = useRef<number | null>(null);

  // Replies cache: parentId -> replies
  const [repliesCache, setRepliesCache] = useState<
    Map<string, schema.ReleaseCommentWithAuthor[]>
  >(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  // Ref so refreshIncremental can access cached parent IDs without being a stale closure dep
  const repliesCacheKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    repliesCacheKeysRef.current = new Set(repliesCache.keys());
  }, [repliesCache]);

  // ── Initial / refresh load ───────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setAllComments([]);
    setPageFromStart(1);
    setPageFromEnd(null);
    setTotalPages(1);
    setHasMore(false);

    try {
      // First page (oldest)
      const firstResult = await getReleaseCommentsAction(
        orgId,
        releaseId,
        null,
        {
          limit: PAGE_SIZE,
          page: 1,
          direction: "asc",
        },
      );

      if (!firstResult.success) return;

      const tp = firstResult.pagination?.totalPages ?? 1;
      setTotalPages(tp);
      setPageFromEnd(tp);

      // Merge and deduplicate
      const merged = [...firstResult.data];
      const unique = Array.from(
        new Map(merged.map((c) => [c.id, c])).values(),
      ).sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() -
          new Date(b.createdAt ?? 0).getTime(),
      );
      setAllComments(unique);

      if (tp <= 1) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Last page (newest) - only if different from first
      if (tp > 1) {
        const lastResult = await getReleaseCommentsAction(
          orgId,
          releaseId,
          null,
          {
            limit: PAGE_SIZE,
            page: tp,
            direction: "asc",
          },
        );
        if (lastResult.success) {
          const allMerged = [...unique, ...lastResult.data];
          const allUnique = Array.from(
            new Map(allMerged.map((c) => [c.id, c])).values(),
          ).sort(
            (a, b) =>
              new Date(a.createdAt ?? 0).getTime() -
              new Date(b.createdAt ?? 0).getTime(),
          );
          setAllComments(allUnique);
        }
      }

      setHasMore(2 <= tp - 1);
    } finally {
      setLoading(false);
    }
  }, [orgId, releaseId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey intentionally triggers a full reload
  useEffect(() => {
    if (
      prevRefreshKey.current !== null &&
      prevRefreshKey.current === refreshKey
    )
      return;
    prevRefreshKey.current = refreshKey;
    void loadInitial();
  }, [loadInitial, refreshKey]);

  // ── Incremental refresh (for SSE events) ──────────────────────────────────
  // Fetches latest comments and merges them without clearing state or resetting pagination
  const refreshIncremental = useCallback(async () => {
    try {
      // 1. Fetch latest top-level comments — add new ones and update replyCount on existing
      const result = await getReleaseCommentsAction(orgId, releaseId, null, {
        limit: PAGE_SIZE,
        page: 1,
        direction: "desc",
      });
      if (result.success && result.data.length > 0) {
        setAllComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newComments = result.data.filter((c) => !existingIds.has(c.id));
          // Update replyCount on existing top-level comments in case a reply was added
          const updated = prev.map((c) => {
            const fresh = result.data.find((r) => r.id === c.id);
            return fresh ? { ...c, replyCount: fresh.replyCount } : c;
          });
          if (newComments.length === 0) return updated;
          return [...newComments, ...updated].sort(
            (a, b) =>
              new Date(a.createdAt ?? 0).getTime() -
              new Date(b.createdAt ?? 0).getTime(),
          );
        });
      }

      // 2. Refresh all currently-expanded reply threads so new replies appear immediately
      const cachedParentIds = repliesCacheKeysRef.current;
      if (cachedParentIds.size > 0) {
        const refreshResults = await Promise.all(
          Array.from(cachedParentIds).map((parentId) =>
            getReleaseCommentRepliesAction(orgId, releaseId, parentId).then((r) => ({
              parentId,
              result: r,
            }))
          ),
        );
        setRepliesCache((prev) => {
          const next = new Map(prev);
          for (const { parentId, result: r } of refreshResults) {
            if (r.success) {
              next.set(parentId, r.data);
            }
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to refresh comments:", error);
    }
  }, [orgId, releaseId]);

  // Register the incremental refresh function with the parent
  useEffect(() => {
    onRegisterRefresh?.(refreshIncremental);
  }, [onRegisterRefresh, refreshIncremental]);

  // ── Load more (converging inward) ────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || pageFromEnd === null) return;
    setLoadingMore(true);
    try {
      const nextStart = pageFromStart + 1;
      const nextEnd = pageFromEnd - 1;

      const [startResult, endResult] = await Promise.all([
        getReleaseCommentsAction(orgId, releaseId, null, {
          limit: PAGE_SIZE,
          page: nextStart,
          direction: "asc",
        }),
        nextEnd > nextStart
          ? getReleaseCommentsAction(orgId, releaseId, null, {
            limit: PAGE_SIZE,
            page: nextEnd,
            direction: "asc",
          })
          : Promise.resolve({ success: true, data: [] }),
      ]);

      if (startResult.success || endResult.success) {
        const newComments = [
          ...(startResult.success ? startResult.data : []),
          ...(endResult.success ? endResult.data : []),
        ];
        setAllComments((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          const merged = [
            ...prev,
            ...newComments.filter((c) => !existing.has(c.id)),
          ];
          return merged.sort(
            (a, b) =>
              new Date(a.createdAt ?? 0).getTime() -
              new Date(b.createdAt ?? 0).getTime(),
          );
        });
      }

      setPageFromStart(nextStart);
      setPageFromEnd(nextEnd);
      setHasMore(nextStart <= nextEnd);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, pageFromStart, pageFromEnd, orgId, releaseId]);

  // ── Reactions (optimistic) ───────────────────────────────────────────────
  const applyReaction = useCallback(
    (commentId: string, emoji: ReactionEmoji, userId: string) => {
      setAllComments((list) =>
        list.map((c) => applyOptimisticReaction(c, commentId, emoji, userId)),
      );
    },
    [],
  );

  const currentUserSummary = useMemo(
    () => availableUsers.find((u) => u.id === currentUserId),
    [availableUsers, currentUserId],
  );

  // ── Post new comment ─────────────────────────────────────────────────────
  const handlePostComment = useCallback(
    async (content: schema.NodeJSON, visibility: "public" | "internal") => {
      const updatedContent = await processUploads(
        content,
        visibility,
        orgId,
        "create-release-comment",
      );
      const result = await createReleaseCommentAction(
        orgId,
        releaseId,
        { content: updatedContent, visibility },
        sseClientId,
      );
      if (result.success && result.data && currentUserSummary) {
        const optimisticComment: schema.ReleaseCommentWithAuthor = {
          ...result.data,
          content: updatedContent,
          createdBy: currentUserSummary,
          reactions: { total: 0, reactions: {} },
        };
        setAllComments((list) =>
          applyOptimisticCommentCreate(list, optimisticComment),
        );
      }
      return result.success;
    },
    [orgId, releaseId, sseClientId, currentUserSummary],
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: schema.NodeJSON) => {
      const result = await updateReleaseCommentAction(
        orgId,
        releaseId,
        commentId,
        { content },
        sseClientId,
      );
      if (result.success && result.data) {
        setAllComments((list) =>
          applyOptimisticCommentUpdate(list, commentId, {
            content: result.data.content as schema.NodeJSON,
          }),
        );
      }
      return result.success;
    },
    [orgId, releaseId, sseClientId],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      const result = await deleteReleaseCommentAction(
        orgId,
        releaseId,
        commentId,
      );
      if (result.success) {
        setAllComments((list) => applyOptimisticCommentDelete(list, commentId));
        // Also remove replies from cache if this was a top-level comment
        setRepliesCache((prev) => {
          const next = new Map(prev);
          next.delete(commentId);
          return next;
        });
      }
      return result.success;
    },
    [orgId, releaseId],
  );

  const handlePostReply = useCallback(
    async (
      parentId: string,
      content: schema.NodeJSON,
      visibility: "public" | "internal",
    ) => {
      const updatedContent = await processUploads(
        content,
        visibility,
        orgId,
        "create-release-comment",
      );
      const result = await createReleaseCommentAction(
        orgId,
        releaseId,
        { content: updatedContent, visibility, parentId },
        sseClientId,
      );
      if (result.success && result.data && currentUserSummary) {
        const optimisticReply: schema.ReleaseCommentWithAuthor = {
          ...result.data,
          content: updatedContent,
          createdBy: currentUserSummary,
          reactions: { total: 0, reactions: {} },
        };
        // Only update replies cache - replies should NOT be in allComments
        setRepliesCache((prev) => {
          const existing = prev.get(parentId) ?? [];
          return new Map(prev).set(parentId, [...existing, optimisticReply]);
        });
        // Update reply count on parent
        setAllComments((list) =>
          list.map((c) =>
            c.id === parentId
              ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
              : c,
          ),
        );
      }
      return result.success;
    },
    [orgId, releaseId, sseClientId, currentUserSummary],
  );

  const handleEditReply = useCallback(
    async (replyId: string, content: schema.NodeJSON) => {
      const result = await updateReleaseCommentAction(
        orgId,
        releaseId,
        replyId,
        { content },
        sseClientId,
      );
      if (result.success && result.data) {
        // Only update in replies cache - replies are not in allComments
        setRepliesCache((prev) => {
          const next = new Map(prev);
          for (const [parentId, replies] of next) {
            const updated = replies.map((r) =>
              r.id === replyId
                ? { ...r, content: result.data.content as schema.NodeJSON }
                : r,
            );
            next.set(parentId, updated);
          }
          return next;
        });
      }
      return result.success;
    },
    [orgId, releaseId, sseClientId],
  );

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      const result = await deleteReleaseCommentAction(
        orgId,
        releaseId,
        replyId,
      );
      if (result.success) {
        // Find the parent from replies cache to decrement reply count
        let parentId: string | undefined;
        setRepliesCache((prev) => {
          const next = new Map(prev);
          for (const [pid, replies] of next) {
            if (replies.some((r) => r.id === replyId)) {
              parentId = pid;
              const filtered = replies.filter((r) => r.id !== replyId);
              next.set(pid, filtered);
            }
          }
          return next;
        });
        // Update reply count on parent
        if (parentId) {
          setAllComments((list) =>
            list.map((c) =>
              c.id === parentId
                ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }
                : c,
            ),
          );
        }
      }
      return result.success;
    },
    [orgId, releaseId],
  );

  const handleReactionToggle = useCallback(
    async (commentId: string, emoji: ReactionEmoji) => {
      if (!currentUserId) return;

      // Optimistic update on allComments
      applyReaction(commentId, emoji, currentUserId);

      // Also update in replies cache
      setRepliesCache((prev) => {
        const next = new Map(prev);
        for (const [parentId, replies] of next) {
          const updated = replies.map((r) =>
            applyOptimisticReaction(r, commentId, emoji, currentUserId),
          );
          next.set(parentId, updated);
        }
        return next;
      });

      // Determine if we're adding or removing
      const target = allComments.find((c) => c.id === commentId);
      const hasReacted =
        target?.reactions?.reactions?.[emoji]?.users.includes(currentUserId) ??
        false;

      try {
        if (hasReacted) {
          await removeReleaseCommentReactionAction(releaseId, commentId, emoji);
        } else {
          await addReleaseCommentReactionAction(
            orgId,
            releaseId,
            commentId,
            emoji,
            sseClientId,
          );
        }
      } catch {
        // Revert on failure
        applyReaction(commentId, emoji, currentUserId);
        setRepliesCache((prev) => {
          const next = new Map(prev);
          for (const [parentId, replies] of next) {
            const updated = replies.map((r) =>
              applyOptimisticReaction(r, commentId, emoji, currentUserId),
            );
            next.set(parentId, updated);
          }
          return next;
        });
      }
    },
    [currentUserId, applyReaction, allComments, orgId, releaseId, sseClientId],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  // Split at midpoint for "Load More" button placement
  const halfway = Math.floor(allComments.length / 2);
  const topItems = allComments.slice(0, halfway);
  const bottomItems = allComments.slice(halfway);

  // On-demand reply loading
  const loadReplies = useCallback(
    async (commentId: string) => {
      if (repliesCache.has(commentId) || loadingReplies.has(commentId)) return;
      setLoadingReplies((prev) => new Set(prev).add(commentId));
      try {
        const result = await getReleaseCommentRepliesAction(
          orgId,
          releaseId,
          commentId,
        );
        if (result.success) {
          setRepliesCache((prev) => new Map(prev).set(commentId, result.data));
        }
      } finally {
        setLoadingReplies((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [orgId, releaseId, repliesCache, loadingReplies],
  );

  const renderCard = (c: schema.ReleaseCommentWithAuthor) => (
    <TopLevelCommentCard
      key={c.id}
      comment={c}
      replies={repliesCache.get(c.id) ?? []}
      onLoadReplies={() => loadReplies(c.id)}
      repliesLoading={loadingReplies.has(c.id)}
      availableUsers={availableUsers}
      currentUserId={currentUserId}
      canManage={canManage}
      orgId={orgId}
      releaseId={releaseId}
      sseClientId={sseClientId}
      onReactionToggle={handleReactionToggle}
      onReplyReactionToggle={handleReactionToggle}
      onPostReply={handlePostReply}
      onEditReply={handleEditReply}
      onDeleteReply={handleDeleteReply}
      onEditComment={handleEditComment}
      onDeleteComment={handleDeleteComment}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <Label variant="subheading">Discussion</Label>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <IconLoader2 className="animate-spin size-5 text-muted-foreground" />
        </div>
      ) : allComments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No comments yet. Be the first to start the discussion.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Top half */}
          {topItems.map(renderCard)}

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center py-1 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs text-muted-foreground gap-1.5"
              >
                {loadingMore ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconChevronDown size={14} />
                )}
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          {/* Bottom half */}
          {bottomItems.map(renderCard)}
        </div>
      )}

      {canComment && (
        <div
          className={cn(
            "rounded-xl",
            mainInputVisibility === "internal"
              ? "bg-internal border border-internal-border"
              : "bg-card border border-border",
          )}
        >
          <CommentInput
            availableUsers={availableUsers}
            placeholder="Write a comment..."
            submitLabel="Post"
            onPost={handlePostComment}
            onVisibilityChange={setMainInputVisibility}
          />
        </div>
      )}
    </div>
  );
}

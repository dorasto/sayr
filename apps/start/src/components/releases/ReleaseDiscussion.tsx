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

const Editor = lazy(() => import("@/components/prosekit/editor"));

const PAGE_SIZE = 10;

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

// ---------------------------------------------------------------------------
// TopLevelCommentCard
// ---------------------------------------------------------------------------
interface TopLevelCommentCardProps {
  comment: schema.ReleaseCommentWithAuthor;
  replies: schema.ReleaseCommentWithAuthor[];
  availableUsers: schema.UserSummary[];
  currentUserId?: string;
  canManage: boolean;
  orgId: string;
  releaseId: string;
  sseClientId: string;
  onReload: () => void;
  onReactionToggle: (commentId: string, emoji: ReactionEmoji) => void;
  onReplyReactionToggle: (replyId: string, emoji: ReactionEmoji) => void;
}

function TopLevelCommentCard({
  comment,
  replies,
  availableUsers,
  currentUserId,
  canManage,
  orgId,
  releaseId,
  sseClientId,
  onReload,
  onReactionToggle,
  onReplyReactionToggle,
}: TopLevelCommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<schema.NodeJSON | undefined>(
    comment.content as schema.NodeJSON | undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

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
    const result = await updateReleaseCommentAction(
      orgId,
      releaseId,
      comment.id,
      { content: editContent },
      sseClientId,
    );
    setIsSaving(false);
    if (result.success) {
      setIsEditing(false);
      onReload();
    }
  }, [editContent, orgId, releaseId, comment.id, sseClientId, onReload]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    const result = await deleteReleaseCommentAction(
      orgId,
      releaseId,
      comment.id,
    );
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    if (result.success) onReload();
  }, [orgId, releaseId, comment.id, onReload]);

  const handlePostReply = useCallback(
    async (content: schema.NodeJSON) => {
      const result = await createReleaseCommentAction(
        orgId,
        releaseId,
        { content, visibility: "internal", parentId: comment.id },
        sseClientId,
      );
      if (result.success) onReload();
      return result.success;
    },
    [orgId, releaseId, comment.id, sseClientId, onReload],
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
      if (result.success) onReload();
      return result.success;
    },
    [orgId, releaseId, sseClientId, onReload],
  );

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      const result = await deleteReleaseCommentAction(
        orgId,
        releaseId,
        replyId,
      );
      if (result.success) onReload();
      return result.success;
    },
    [orgId, releaseId, onReload],
  );

  return (
    <>
      <div
        className={cn(
          "border bg-card relative overflow-hidden group/comment rounded-xl px-3",
          comment.visibility === "internal" && "bg-primary/5 border-primary/30",
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
                    onClick={() => setShowReplies((v) => !v)}
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
              count={replies.length}
              replyAuthors={replyAuthors}
              isInternal={comment.visibility === "internal"}
              onClick={() => setShowReplies(true)}
              className="px-0!"
            />
          </div>
        )}

        {/* Expanded reply thread */}
        {showReplies && (
          <>
            {replies.length > 0 && (
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
                <div className="flex flex-col mt-1">
                  {replies.map((reply) => (
                    <div key={reply.id} className="px-3 py-0.5">
                      <CommentItem
                        comment={reply}
                        availableUsers={availableUsers}
                        isOwn={
                          !!currentUserId &&
                          reply.createdBy?.id === currentUserId
                        }
                        canManage={canManage}
                        currentUserId={currentUserId}
                        onEdit={handleEditReply}
                        onDelete={handleDeleteReply}
                        onReactionToggle={onReplyReactionToggle}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="">
              <CommentInput
                availableUsers={availableUsers}
                placeholder="Reply..."
                onPost={handlePostReply}
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
}

export function ReleaseDiscussion({
  releaseId,
  orgId,
  currentUserId,
  canComment = true,
  canManage = false,
  refreshKey = 0,
}: Props) {
  const { organization } = useLayoutOrganization();
  const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

  const availableUsers = organization.members.map(
    (m) => m.user as schema.UserSummary,
  );

  // ── Pagination state ────────────────────────────────────────────────────
  const [total, setTotal] = useState(0);
  const [firstComments, setFirstComments] = useState<
    schema.ReleaseCommentWithAuthor[]
  >([]);
  const [lastComments, setLastComments] = useState<
    schema.ReleaseCommentWithAuthor[]
  >([]);
  const [middleComments, setMiddleComments] = useState<
    schema.ReleaseCommentWithAuthor[]
  >([]);
  const [nextMiddleOffset, setNextMiddleOffset] = useState(PAGE_SIZE);
  const [lastOffset, setLastOffset] = useState(0); // position where "last page" starts
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Tracks the refreshKey that was last used so we know when to reset
  const prevRefreshKey = useRef<number | null>(null);

  // All top-level comments in order (firstComments + middleComments + lastComments), deduped
  const allTopLevel = useMemo(() => {
    const seen = new Set<string>();
    const result: schema.ReleaseCommentWithAuthor[] = [];
    for (const c of [...firstComments, ...middleComments, ...lastComments]) {
      if (!c.parentId && !seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }
    return result;
  }, [firstComments, middleComments, lastComments]);

  // All replies keyed by parentId (drawn from all loaded comment sets)
  const repliesByParent = useMemo(() => {
    const all = [...firstComments, ...middleComments, ...lastComments];
    const map = new Map<string, schema.ReleaseCommentWithAuthor[]>();
    for (const c of all) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        // dedup within each parent
        if (!arr.some((r) => r.id === c.id)) arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [firstComments, middleComments, lastComments]);

  const hasMoreMiddle = nextMiddleOffset < lastOffset;

  // ── Initial / refresh load ───────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setFirstComments([]);
    setLastComments([]);
    setMiddleComments([]);
    setNextMiddleOffset(PAGE_SIZE);

    try {
      // First page (oldest)
      const firstResult = await getReleaseCommentsAction(
        orgId,
        releaseId,
        null,
        {
          limit: PAGE_SIZE,
          offset: 0,
          direction: "asc",
        },
      );

      if (!firstResult.success) return;

      const totalCount = firstResult.total ?? 0;
      setTotal(totalCount);
      // Filter to top-level for display; replies are included too (they're embedded)
      setFirstComments(firstResult.data);

      if (totalCount <= PAGE_SIZE) {
        // All comments fit in the first page
        setLastOffset(PAGE_SIZE); // no last page needed; nextMiddleOffset (PAGE_SIZE) >= lastOffset
        setLoading(false);
        return;
      }

      // Calculate last page offset (start after the first page, no earlier)
      const lo = Math.max(PAGE_SIZE, totalCount - PAGE_SIZE);
      setLastOffset(lo);
      setNextMiddleOffset(PAGE_SIZE);

      // Last page (newest)
      const lastResult = await getReleaseCommentsAction(
        orgId,
        releaseId,
        null,
        {
          limit: PAGE_SIZE,
          offset: lo,
          direction: "asc",
        },
      );
      if (lastResult.success) {
        setLastComments(lastResult.data);
      }
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

  // ── Load more (middle) ───────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMoreMiddle || loadingMore) return;
    setLoadingMore(true);
    try {
      const limit = Math.min(PAGE_SIZE, lastOffset - nextMiddleOffset);
      const result = await getReleaseCommentsAction(orgId, releaseId, null, {
        limit,
        offset: nextMiddleOffset,
        direction: "asc",
      });
      if (result.success) {
        setMiddleComments((prev) => {
          const existing = new Set(prev.map((c) => c.id));
          return [...prev, ...result.data.filter((c) => !existing.has(c.id))];
        });
        setNextMiddleOffset((o) => o + limit);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMoreMiddle,
    loadingMore,
    orgId,
    releaseId,
    nextMiddleOffset,
    lastOffset,
  ]);

  // ── Post new comment ─────────────────────────────────────────────────────
  const handlePostComment = useCallback(
    async (content: schema.NodeJSON, visibility: "public" | "internal") => {
      const result = await createReleaseCommentAction(
        orgId,
        releaseId,
        { content, visibility },
        sseClientId,
      );
      if (result.success) void loadInitial();
      return result.success;
    },
    [orgId, releaseId, sseClientId, loadInitial],
  );

  // ── Reactions (optimistic) ───────────────────────────────────────────────
  const applyReaction = useCallback(
    (commentId: string, emoji: ReactionEmoji, userId: string) => {
      const apply = (list: schema.ReleaseCommentWithAuthor[]) =>
        list.map((c) => applyOptimisticReaction(c, commentId, emoji, userId));
      setFirstComments(apply);
      setMiddleComments(apply);
      setLastComments(apply);
    },
    [],
  );

  const handleReactionToggle = useCallback(
    async (commentId: string, emoji: ReactionEmoji) => {
      if (!currentUserId) return;

      // Optimistic update
      applyReaction(commentId, emoji, currentUserId);

      // Determine if we're adding or removing
      const allComments = [
        ...firstComments,
        ...middleComments,
        ...lastComments,
      ];
      const target = allComments.find((c) => c.id === commentId);
      const hasReacted =
        target?.reactions?.reactions?.[emoji]?.users.includes(currentUserId) ??
        false;

      try {
        if (hasReacted) {
          // Already has the reaction (before optimistic), so we're removing — but optimistic already toggled
          // Re-check: optimistic toggled it, so if it WAS reacted, now it's not → call remove
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
      }
    },
    [
      currentUserId,
      applyReaction,
      firstComments,
      middleComments,
      lastComments,
      orgId,
      releaseId,
      sseClientId,
    ],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  // Split allTopLevel into "first section" (firstComments top-level) and "last section" (lastComments top-level)
  // for rendering the load-more button in between
  const firstTopLevel = useMemo(() => {
    const firstIds = new Set(firstComments.map((c) => c.id));
    return allTopLevel.filter((c) => !c.parentId && firstIds.has(c.id));
  }, [allTopLevel, firstComments]);

  const middleTopLevel = useMemo(() => {
    const firstIds = new Set(firstComments.map((c) => c.id));
    const lastIds = new Set(lastComments.map((c) => c.id));
    return allTopLevel.filter(
      (c) => !c.parentId && !firstIds.has(c.id) && !lastIds.has(c.id),
    );
  }, [allTopLevel, firstComments, lastComments]);

  const lastTopLevel = useMemo(() => {
    const firstIds = new Set(firstComments.map((c) => c.id));
    const lastIds = new Set(lastComments.map((c) => c.id));
    return allTopLevel.filter(
      (c) => !c.parentId && !firstIds.has(c.id) && lastIds.has(c.id),
    );
  }, [allTopLevel, firstComments, lastComments]);

  const renderCard = (c: schema.ReleaseCommentWithAuthor) => (
    <TopLevelCommentCard
      key={c.id}
      comment={c}
      replies={repliesByParent.get(c.id) ?? []}
      availableUsers={availableUsers}
      currentUserId={currentUserId}
      canManage={canManage}
      orgId={orgId}
      releaseId={releaseId}
      sseClientId={sseClientId}
      onReload={loadInitial}
      onReactionToggle={handleReactionToggle}
      onReplyReactionToggle={handleReactionToggle}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <Label variant="subheading">Discussion</Label>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <IconLoader2 className="animate-spin size-5 text-muted-foreground" />
        </div>
      ) : allTopLevel.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No comments yet. Be the first to start the discussion.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Oldest comments */}
          {firstTopLevel.map(renderCard)}

          {/* Middle comments (loaded on demand) */}
          {middleTopLevel.map(renderCard)}

          {/* Load more button */}
          {hasMoreMiddle && (
            <div className="flex justify-center py-1">
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
                {loadingMore
                  ? "Loading..."
                  : `Load ${Math.min(PAGE_SIZE, lastOffset - nextMiddleOffset)} more`}
              </Button>
            </div>
          )}

          {/* Newest comments */}
          {lastTopLevel.map(renderCard)}
        </div>
      )}

      {canComment && (
        <CommentInput
          availableUsers={availableUsers}
          placeholder="Write a comment..."
          submitLabel="Post"
          onPost={handlePostComment}
          className="rounded-xl bg-card"
        />
      )}
    </div>
  );
}

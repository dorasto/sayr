import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
  useStateManagement,
  useStateManagementInfiniteFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { IconArrowBack, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import {
  CreateTaskCommentAction,
  CreateTaskReactionAction,
  DeleteTaskCommentAction,
  UpdateTaskCommentAction,
} from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import type { CommentData, CommentsPage } from "./public-comments-types";
import { PublicCommentItem } from "./public-comment-item";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const baseApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/internal"
    : "/api/internal";

interface PublicCommentsProps {
  taskId: string;
  organizationId: string;
}

export function PublicComments({
  taskId,
  organizationId,
}: PublicCommentsProps) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { organization, categories } = usePublicOrganizationLayout();
  const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
  const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(
    undefined,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const commentLimit = 20;

  // Build a Set of org member user IDs for badge display
  const memberUserIds = useMemo(
    () => new Set(organization.members.map((m) => m.user.id)),
    [organization.members],
  );

  // Map org members to a user array for mentions + reaction tooltips
  const orgUsers = useMemo(
    () => organization.members.map((m) => m.user) as schema.userType[],
    [organization.members],
  );

  const {
    value: {
      data: commentsData,
      isLoading,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    },
  } = useStateManagementInfiniteFetch<CommentsPage>({
    key: ["public-comments", taskId, organizationId],
    fetch: {
      url: `${baseApiUrl}/v1/admin/organization/task/timeline/comments?org_id=${organizationId}&task_id=${taskId}&limit=${commentLimit / 2}`,
      custom: async (url, pageParam) => {
        const { fromStart = 1, fromEnd } = pageParam ?? {};

        // Fetch the "start" page first to discover totalPages
        const firstUrl = `${url}&page=${fromStart}`;
        const firstRes = await fetch(firstUrl, { credentials: "include" });
        if (!firstRes.ok) throw new Error(`Failed: ${firstRes.statusText}`);
        const firstData = await firstRes.json();

        const totalPages = Number(firstData.pagination?.totalPages ?? 1);
        const endPage = fromEnd ?? totalPages;

        // If start and end are the same page, skip second fetch
        let lastData = { data: [] };
        if (endPage !== fromStart) {
          const lastUrl = `${url}&page=${endPage}`;
          const lastRes = await fetch(lastUrl, { credentials: "include" });
          if (lastRes.ok) lastData = await lastRes.json();
        }

        // Merge, deduplicate by id, sort chronologically
        const merged = [...(firstData.data || []), ...(lastData.data || [])];
        const unique = Array.from(
          new Map(merged.map((i: CommentData) => [i.id, i])).values(),
        ).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

        const nextStart = fromStart + 1;
        const nextEnd = endPage - 1;
        const hasMore = nextStart <= nextEnd;

        return {
          data: unique,
          pagination: {
            pageFromStart: fromStart,
            pageFromEnd: endPage,
            totalPages,
            hasMore,
          },
        };
      },
      getNextPageParam: (lastPage) => {
        const p = lastPage.pagination;
        if (!p || !p.hasMore) return undefined;
        return {
          fromStart: p.pageFromStart + 1,
          fromEnd: p.pageFromEnd - 1,
        };
      },
    },
    staleTime: 1000 * 30,
  });

  // Flatten all pages with deduplication (prefer newer pages)
  const allComments = useMemo(() => {
    if (!commentsData) return [];
    const seen = new Set<string>();
    const result: CommentData[] = [];

    for (let i = commentsData.length - 1; i >= 0; i--) {
      const page = commentsData[i];
      for (const item of page?.data ?? []) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        result.push(item);
      }
    }

    return result.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [commentsData]);

  // Split at midpoint for outside-in rendering
  const halfway = Math.floor(allComments.length / 2);
  const topComments = allComments.slice(0, halfway);
  const bottomComments = allComments.slice(halfway);

  // Optimistic reaction toggle (mirrors admin timeline-comment.tsx pattern)
  const handleToggleReaction = useCallback(
    async (commentId: string, emoji: ReactionEmoji) => {
      if (!session?.user?.id) return;

      const queryKey = ["public-comments", taskId, organizationId];
      const userId = session.user.id;

      const previousData =
        queryClient.getQueryData<InfiniteData<CommentsPage>>(queryKey);

      queryClient.setQueryData<InfiniteData<CommentsPage>>(queryKey, (old) => {
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
                  total > 0 ? { total, reactions: newReactions } : undefined,
              };
            }),
          })),
        };
      });

      try {
        await CreateTaskReactionAction(
          organizationId,
          taskId,
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
    [session?.user?.id, taskId, organizationId, queryClient, wsClientId],
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: NodeJSON) => {
      try {
        const result = await UpdateTaskCommentAction(
          organizationId,
          taskId,
          commentId,
          content,
          "public",
          wsClientId,
        );
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: ["public-comments", taskId, organizationId],
          });
          return true;
        }
        headlessToast.error({
          title: "Failed to update comment",
          description: result.error || "Something went wrong.",
          id: "edit-comment-error",
        });
        return false;
      } catch {
        headlessToast.error({
          title: "Failed to update comment",
          description: "Could not update your comment. Please try again.",
          id: "edit-comment-error",
        });
        return false;
      }
    },
    [organizationId, taskId, wsClientId, queryClient],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const result = await DeleteTaskCommentAction(
          organizationId,
          taskId,
          commentId,
          wsClientId,
        );
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: ["public-comments", taskId, organizationId],
          });
          return true;
        }
        headlessToast.error({
          title: "Failed to delete comment",
          description: result.error || "Something went wrong.",
          id: "delete-comment-error",
        });
        return false;
      } catch {
        headlessToast.error({
          title: "Failed to delete comment",
          description: "Could not delete the comment. Please try again.",
          id: "delete-comment-error",
        });
        return false;
      }
    },
    [organizationId, taskId, wsClientId, queryClient],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!commentContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await CreateTaskCommentAction(
        organizationId,
        taskId,
        commentContent,
        "public",
        wsClientId,
      );
      if (result.success) {
        setCommentContent(undefined);
        setEditorKey((k) => k + 1);
        queryClient.invalidateQueries({
          queryKey: ["public-comments", taskId, organizationId],
        });
      } else {
        headlessToast.error({
          title: "Failed to post comment",
          description: result.error || "Something went wrong.",
        });
      }
    } catch (error) {
      console.error(error);
      headlessToast.error({
        title: "Failed to post comment",
        description: "Could not post your comment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    commentContent,
    isSubmitting,
    organizationId,
    taskId,
    wsClientId,
    queryClient,
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* Comment list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <IconLoader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : allComments.length === 0 ? (
        <div className="text-muted-foreground text-sm py-4 text-center border rounded-lg bg-card/50 border-dashed">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Top (oldest) comments */}
          {topComments.map((comment) => (
            <PublicCommentItem
              key={comment.id}
              comment={comment}
              isMember={
                !!comment.createdBy && memberUserIds.has(comment.createdBy.id)
              }
              onToggleReaction={
                session?.user ? handleToggleReaction : undefined
              }
              users={orgUsers}
              currentUserId={session?.user?.id}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              categories={categories}
            />
          ))}

          {/* Load more in the middle */}
          {hasNextPage && (
            <div className="flex justify-center py-4 my-2 border-t border-b border-dashed">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <IconLoader2 className="animate-spin size-4 mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load more comments"
                )}
              </Button>
            </div>
          )}

          {/* Bottom (newest) comments */}
          {bottomComments.map((comment) => (
            <PublicCommentItem
              key={comment.id}
              comment={comment}
              isMember={
                !!comment.createdBy && memberUserIds.has(comment.createdBy.id)
              }
              onToggleReaction={
                session?.user ? handleToggleReaction : undefined
              }
              users={orgUsers}
              currentUserId={session?.user?.id}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              categories={categories}
            />
          ))}
        </div>
      )}

      {/* Comment input */}
      {session?.user ? (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Suspense
            fallback={<div className="h-20 animate-pulse bg-muted rounded" />}
          >
            <Editor
              key={editorKey}
              firstLinePlaceholder="Write a comment..."
              className="p-3 pb-0 bg-transparent"
              onChange={setCommentContent}
              submit={handleSubmitComment}
              users={orgUsers}
              categories={categories}
              hideBlockHandle
            />
          </Suspense>
          <div className="flex items-center justify-end px-3 pb-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitComment}
              disabled={isSubmitting || !commentContent}
            >
              {isSubmitting ? (
                <IconLoader2 className="animate-spin size-4" />
              ) : (
                <IconArrowBack className="size-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card/50 border-dashed text-center">
          <p className="text-muted-foreground text-sm">
            Sign in to leave a comment.
          </p>
        </div>
      )}
    </div>
  );
}

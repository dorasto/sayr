import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  useStateManagement,
  useStateManagementInfiniteFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { IconArrowBack, IconLoader2 } from "@tabler/icons-react";
import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import {
  createReleaseCommentAction,
  updateReleaseCommentAction,
  deleteReleaseCommentAction,
  addReleaseCommentReactionAction,
  removeReleaseCommentReactionAction,
} from "@/lib/fetches/release";
import processUploads from "@/components/prosekit/upload";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getBlockedUserIdsAction } from "@/lib/fetches/organization";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { PublicCommentItem } from "../public-comment-item";
import {
  PublicCommentThreadTrigger,
  PublicCommentThreadBody,
} from "../public-comment-thread";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { ServerEventMessage } from "@/lib/serverEvents";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { task } from "node_modules/@repo/database/schema/task.schema";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const basePublicApiUrl =
  import.meta.env.VITE_APP_ENV === "development"
    ? "/backend-api/public/v1"
    : "/api/public/v1";

interface PublicReleaseDiscussionProps {
  releaseId: string;
  releaseSlug: string;
  organizationId: string;
  orgSlug: string;
}

interface ReleaseCommentData {
  id: string;
  releaseId: string;
  organizationId: string;
  createdBy: schema.UserSummary | null;
  content: NodeJSON | null;
  visibility: "public" | "internal";
  parentId: string | null;
  statusUpdateId: string | null;
  replyCount: number;
  replyAuthors?: schema.UserSummary[];
  reactions?: {
    total: number;
    reactions: Record<string, { count: number; users: string[] }>;
  };
  createdAt: string;
  updatedAt: string;
}

interface ReleaseCommentsPage {
  data: ReleaseCommentData[];
  pagination: {
    pageFromStart: number;
    pageFromEnd: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Score a team's permissions to determine hierarchy weight.
 */
function scorePermissions(permissions: schema.TeamPermissions): number {
  let score = 0;
  if (permissions.admin.administrator) score += 100;
  if (permissions.admin.manageMembers) score += 50;
  if (permissions.admin.manageTeams) score += 50;
  if (permissions.moderation.manageComments) score += 20;
  if (permissions.moderation.approveSubmissions) score += 20;
  if (permissions.moderation.manageVotes) score += 20;
  if (permissions.tasks.editAny) score += 10;
  if (permissions.tasks.deleteAny) score += 10;
  if (permissions.tasks.create) score += 5;
  if (permissions.tasks.assign) score += 5;
  if (permissions.tasks.changeStatus) score += 5;
  if (permissions.tasks.changePriority) score += 5;
  if (permissions.content.manageCategories) score += 5;
  if (permissions.content.manageLabels) score += 5;
  if (permissions.content.manageViews) score += 5;
  return score;
}

export function PublicReleaseDiscussion({
  releaseId,
  releaseSlug,
  organizationId,
  orgSlug,
}: PublicReleaseDiscussionProps) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { organization, categories, serverEvents } = usePublicOrganizationLayout();
  const { value: sseClientId } = useStateManagement<string>("sseClientId", "");
  const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
  const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const toggleThread = useCallback((commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (organizationId) {
      setMentionContext({ orgId: organizationId });
    }
  }, [organizationId, setMentionContext]);

  const commentLimit = 20;

  // Build a map of userId -> highest team name (by permission weight)
  const memberHighestTeam = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const m of organization.members) {
      const teams = m.teams;
      if (!teams || teams.length === 0) {
        map.set(m.user.id, "Member");
        continue;
      }
      let bestTeam: { name: string; score: number } | null = null;
      for (const mt of teams) {
        const score = scorePermissions(mt.team.permissions);
        if (!bestTeam || score > bestTeam.score) {
          bestTeam = { name: mt.team.name, score };
        }
      }
      map.set(m.user.id, bestTeam?.name ?? "Member");
    }
    return map;
  }, [organization.members]);

  const orgUsers = useMemo(
    () => organization.members.map((m) => m.user) as schema.userType[],
    [organization.members],
  );

  const isOrgMember = useIsOrgMember(organization);

  // For release discussions, we use the org's publicActions setting
  const canAct = useMemo(() => {
    if (!session?.user) return false;
    if (isOrgMember) return true;
    const settings = organization.settings as schema.OrganizationSettings | null;
    if (settings?.publicActions === false) return false;
    return true;
  }, [session?.user, isOrgMember, organization.settings]);

  // Fetch blocked user IDs
  const { data: blockedUserIdsArray } = useQuery({
    queryKey: ["blocked-user-ids", organizationId],
    queryFn: () => getBlockedUserIdsAction(organizationId),
    enabled: isOrgMember,
    staleTime: 60_000,
  });

  const blockedUserIds = useMemo(
    () => new Set(blockedUserIdsArray ?? []),
    [blockedUserIdsArray],
  );

  const {
    value: {
      data: commentsData,
      isLoading,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
    },
  } = useStateManagementInfiniteFetch<ReleaseCommentsPage>({
    key: ["public-release-comments", releaseId, organizationId],
    fetch: {
      url: `${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/comments`,
      custom: async (url, pageParam) => {
        const { fromStart = 1, fromEnd } = pageParam ?? {};

        const firstUrl = `${url}?page=${fromStart}&limit=${commentLimit / 2}&direction=asc`;
        const firstRes = await fetch(firstUrl);
        if (!firstRes.ok) throw new Error(`Failed: ${firstRes.statusText}`);
        const firstData = await firstRes.json();

        const totalPages = Number(firstData.data?.pagination?.totalPages ?? 1);
        const endPage = fromEnd ?? totalPages;

        let lastData = { data: { comments: [] } };
        if (endPage !== fromStart) {
          const lastUrl = `${url}?page=${endPage}&limit=${commentLimit / 2}&direction=asc`;
          const lastRes = await fetch(lastUrl);
          if (lastRes.ok) lastData = await lastRes.json();
        }

        const merged = [
          ...(firstData.data?.comments || []),
          ...(lastData.data?.comments || []),
        ];
        const unique = Array.from(
          new Map(merged.map((i: ReleaseCommentData) => [i.id, i])).values(),
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

  const allComments = useMemo(() => {
    if (!commentsData) return [];
    const seen = new Set<string>();
    const result: ReleaseCommentData[] = [];

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

  const halfway = Math.floor(allComments.length / 2);
  const topComments = allComments.slice(0, halfway);
  const bottomComments = allComments.slice(halfway);

  // Optimistic reaction toggle
  const handleToggleReaction = useCallback(
    async (commentId: string, emoji: ReactionEmoji) => {
      if (!session?.user?.id) return;

      const queryKey = ["public-release-comments", releaseId, organizationId];
      const userId = session.user.id;

      // Determine if user has already reacted (before optimistic update)
      const target = allComments.find((c) => c.id === commentId);
      const hasReacted =
        target?.reactions?.reactions?.[emoji]?.users.includes(userId) ?? false;

      const previousData =
        queryClient.getQueryData<InfiniteData<ReleaseCommentsPage>>(queryKey);

      queryClient.setQueryData<InfiniteData<ReleaseCommentsPage>>(queryKey, (old) => {
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
        if (hasReacted) {
          await removeReleaseCommentReactionAction(releaseId, commentId, emoji);
        } else {
          await addReleaseCommentReactionAction(
            organizationId,
            releaseId,
            commentId,
            emoji,
            sseClientId,
          );
        }
      } catch {
        queryClient.setQueryData(queryKey, previousData);
        headlessToast.error({
          title: "Reaction failed",
          description: "Could not update your reaction. Please try again.",
          id: "reaction-error",
        });
      }
    },
    [session?.user?.id, releaseId, organizationId, queryClient, sseClientId, allComments],
  );

  const handleEditComment = useCallback(
    async (commentId: string, content: NodeJSON) => {
      try {
        const processedContent = await processUploads(content, "public", organizationId, "public-release-comment-edit");
        const result = await updateReleaseCommentAction(
          organizationId,
          releaseId,
          commentId,
          { content: processedContent },
          sseClientId,
        );
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: ["public-release-comments", releaseId, organizationId],
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
    [organizationId, releaseId, sseClientId, queryClient],
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        const result = await deleteReleaseCommentAction(
          organizationId,
          releaseId,
          commentId,
        );
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: ["public-release-comments", releaseId, organizationId],
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
    [organizationId, releaseId, queryClient],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!commentContent || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const processedContent = await processUploads(commentContent, "public", organizationId, "public-release-comment-upload");
      const result = await createReleaseCommentAction(
        organizationId,
        releaseId,
        { content: processedContent, visibility: "public" },
        sseClientId,
      );
      if (result.success) {
        setCommentContent(undefined);
        setEditorKey((k) => k + 1);
        queryClient.invalidateQueries({
          queryKey: ["public-release-comments", releaseId, organizationId],
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
    releaseId,
    sseClientId,
    queryClient,
  ]);

  // Fetch replies for a comment from the public API
  const fetchReplies = useCallback(
    async (commentId: string) => {
      const res = await fetch(
        `${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/comments/${commentId}/replies`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.replies ?? [];
    },
    [orgSlug, releaseSlug],
  );

  // Post a reply to a comment
  const handlePostReply = useCallback(
    async (parentId: string, content: NodeJSON) => {
      try {
        const processedContent = await processUploads(content, "public", organizationId, "public-release-reply-upload");
        const result = await createReleaseCommentAction(
          organizationId,
          releaseId,
          { content: processedContent, visibility: "public", parentId },
          sseClientId,
        );
        if (result.success) {
          queryClient.invalidateQueries({
            queryKey: ["public-release-comments", releaseId, organizationId],
          });
          queryClient.invalidateQueries({
            queryKey: ["comment-replies", parentId, organizationId],
          });
          return true;
        }
        headlessToast.error({
          title: "Failed to post reply",
          description: result.error || "Something went wrong.",
          id: "public-reply-error",
        });
        return false;
      } catch {
        headlessToast.error({
          title: "Failed to post reply",
          description: "Could not post your reply. Please try again.",
          id: "public-reply-error",
        });
        return false;
      }
    },
    [organizationId, releaseId, sseClientId, queryClient],
  );

  const renderComment = (comment: ReleaseCommentData) => {
    const replyCount = comment.replyCount ?? 0;
    const isExpanded = expandedThreads.has(comment.id);

    const threadFooter = (replyCount > 0 || isExpanded) ? (
      <>
        <PublicCommentThreadTrigger
          replyCount={replyCount}
          replyAuthors={comment.replyAuthors}
          expanded={isExpanded}
          onToggle={() => toggleThread(comment.id)}
        />
        {isExpanded && (
          <PublicCommentThreadBody
            parentComment={comment as any}
            memberHighestTeam={memberHighestTeam}
            users={orgUsers}
            currentUserId={session?.user?.id}
            onEdit={canAct ? handleEditComment : undefined}
            onDelete={session?.user ? handleDeleteComment : undefined}
            categories={categories}
            blockedUserIds={blockedUserIds}
            isOrgMember={isOrgMember}
            canAct={canAct}
            fetchReplies={() => fetchReplies(comment.id)}
            onPostReply={(content) => handlePostReply(comment.id, content)}
          />
        )}
      </>
    ) : undefined;

    return (
      <PublicCommentItem
        key={comment.id}
        comment={comment as any}
        memberTeamName={
          comment.createdBy
            ? (memberHighestTeam.get(comment.createdBy.id) ?? null)
            : null
        }
        onToggleReaction={canAct ? handleToggleReaction : undefined}
        users={orgUsers}
        currentUserId={session?.user?.id}
        onEdit={canAct ? handleEditComment : undefined}
        onDelete={session?.user ? handleDeleteComment : undefined}
        categories={categories}
        footer={threadFooter}
        onReply={canAct ? () => {
          if (!expandedThreads.has(comment.id)) {
            toggleThread(comment.id);
          }
        } : undefined}
        blockedUserIds={blockedUserIds}
        isOrgMember={isOrgMember}
      />
    );
  };
  // SSE handlers for real-time updates on this task
  const handlers: WSMessageHandler<ServerEventMessage> = {
    UPDATE_RELEASE_COMMENTS: (msg) => {
      if (
        msg.scope === "PUBLIC" &&
        msg.meta?.orgId === organization.id &&
        msg.data.releaseId === releaseId
      ) {
        queryClient.invalidateQueries({
          queryKey: ["public-release-comments", releaseId, organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["comment-replies"],
        });
      }
    },
  };
  const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);
  useEffect(() => {
    if (!serverEvents.event) return;
    serverEvents.event.addEventListener("message", handleMessage);
    return () => {
      serverEvents.event?.removeEventListener("message", handleMessage);
    };
  }, [serverEvents.event, handleMessage]);
  useEffect(() => {
    const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
      if (msg.type === "SSE_RECONNECTED") {
        console.log("🟢 Global SSE reconnected — refreshing data");
        queryClient.invalidateQueries({
          queryKey: ["public-release-comments", releaseId, organizationId],
        });
        queryClient.invalidateQueries({
          queryKey: ["comment-replies"],
        });
      }
    });
    return unsubscribe;
  }, [releaseId, queryClient, organizationId]);
  return (
    <div className="flex flex-col gap-4">
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
          {topComments.map(renderComment)}

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

          {bottomComments.map(renderComment)}
        </div>
      )}

      {canAct ? (
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
            {!session?.user
              ? "Sign in to leave a comment."
              : "This organization has disabled public actions."}
          </p>
        </div>
      )}
    </div>
  );
}

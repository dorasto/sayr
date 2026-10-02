import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useMemo } from "react";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { CreateTaskReactionAction, FetchCommentRepliesAction } from "@/lib/fetches/task";
import { PublicCommentItem } from "./public-comment-item";
import type { CommentData } from "./public-comments-types";
import { PublicReplyInput } from "./public-reply-input";

interface PublicCommentThreadBodyProps {
	parentComment: CommentData;
	memberHighestTeam: Map<string, string | null>;
	users: schema.userType[];
	currentUserId?: string;
	onEdit?: (commentId: string, content: NodeJSON) => Promise<boolean>;
	onDelete?: (commentId: string) => Promise<boolean>;
	categories: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	blockedUserIds?: Set<string>;
	isOrgMember?: boolean;
	/** Whether the current user can perform write actions (comment, react, reply). */
	canAct?: boolean;
	/** User id of the post's author — replies written by them get the Author pill. */
	authorId?: string | null;
	/** Optional custom fetch function for replies (e.g., for release comments). */
	fetchReplies?: () => Promise<CommentData[]>;
	/** Optional custom post reply function (e.g., for release comments). */
	onPostReply?: (content: NodeJSON) => Promise<boolean>;
}

/**
 * Expanded thread body — fetches and renders replies, plus a reply input.
 */
export function PublicCommentThreadBody({
	parentComment,
	memberHighestTeam,
	users,
	currentUserId,
	onEdit,
	onDelete,
	categories,
	tasks,
	blockedUserIds,
	isOrgMember,
	canAct,
	authorId,
	fetchReplies,
	onPostReply,
}: PublicCommentThreadBodyProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");

	const {
		data: repliesRaw,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["comment-replies", parentComment.id, parentComment.organizationId],
		queryFn: async () => {
			if (fetchReplies) {
				return await fetchReplies();
			}
			const result = await FetchCommentRepliesAction(parentComment.organizationId, parentComment.id);
			if (!result.success) throw new Error(result.error ?? "Failed to fetch replies");
			return result.data;
		},
		enabled: true,
		staleTime: 30_000,
	});

	// Map taskTimelineWithActor replies to CommentData shape (or pass through if already CommentData)
	const replies: CommentData[] = useMemo(() => {
		if (!repliesRaw) return [];
		// If fetchReplies was used, data is already CommentData[]
		if (fetchReplies) {
			return repliesRaw as CommentData[];
		}
		// Otherwise map from taskTimelineWithActor
		return (repliesRaw as schema.taskTimelineWithActor[]).map((r) => ({
			id: r.id,
			taskId: r.taskId ?? parentComment.taskId,
			organizationId: r.organizationId,
			content: r.content as NodeJSON,
			visibility: r.visibility as "public" | "internal",
			createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
			updatedAt:
				r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt ? String(r.updatedAt) : undefined,
			createdBy: r.actor
				? {
						id: r.actor.id,
						name: r.actor.name,
						image: r.actor.image,
						displayName: r.actor.displayName ?? null,
					}
				: null,
			reactions: r.reactions as CommentData["reactions"],
			parentId: r.parentId ?? parentComment.id,
			source: r.source,
			externalAuthorLogin: r.externalAuthorLogin,
			externalAuthorUrl: r.externalAuthorUrl,
		}));
	}, [repliesRaw, parentComment.taskId, parentComment.id, fetchReplies]);

	// Optimistic reaction toggle for replies
	const handleReplyReaction = useCallback(
		async (commentId: string, emoji: ReactionEmoji) => {
			if (!session?.user?.id) return;

			const queryKey = ["comment-replies", parentComment.id, parentComment.organizationId];
			const userId = session.user.id;

			// We optimistically update the replies query
			const previousData = queryClient.getQueryData(queryKey);

			queryClient.setQueryData(queryKey, (old: unknown) => {
				if (!Array.isArray(old)) return old;
				return (old as Array<Record<string, unknown>>).map((reply) => {
					if ((reply as { id: string }).id !== commentId) return reply;

					const currentReactions = ((
						reply as { reactions?: { reactions?: Record<string, { count: number; users: string[] }> } }
					).reactions?.reactions ?? {}) as Record<string, { count: number; users: string[] }>;
					const emojiData = currentReactions[emoji] ?? { count: 0, users: [] };
					const hasReacted = emojiData.users.includes(userId);

					let updatedEmojiData: { count: number; users: string[] };
					if (hasReacted) {
						updatedEmojiData = {
							count: Math.max(0, emojiData.count - 1),
							users: emojiData.users.filter((id: string) => id !== userId),
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

					const total = Object.values(newReactions).reduce((sum, r) => sum + r.count, 0);

					return {
						...reply,
						reactions: total > 0 ? { total, reactions: newReactions } : undefined,
					};
				});
			});

			try {
				await CreateTaskReactionAction(
					parentComment.organizationId,
					parentComment.taskId,
					commentId,
					emoji,
					sseClientId
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
		[
			session?.user?.id,
			parentComment.id,
			parentComment.organizationId,
			parentComment.taskId,
			queryClient,
			sseClientId,
		]
	);

	return (
		<div className="mt-3 border-l-2 border-border pl-5">
			{isLoading ? (
				<div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
					<IconLoader2 aria-hidden className="size-4 animate-spin" />
					Loading replies...
				</div>
			) : (
				replies.length > 0 && (
					<ul className="flex flex-col gap-[18px]">
						{replies.map((reply) => (
							<li key={reply.id}>
								<PublicCommentItem
									comment={reply}
									memberTeamName={reply.createdBy ? (memberHighestTeam.get(reply.createdBy.id) ?? null) : null}
									isAuthor={!!authorId && reply.createdBy?.id === authorId}
									onToggleReaction={canAct ? handleReplyReaction : undefined}
									users={users}
									currentUserId={currentUserId}
									onEdit={onEdit}
									onDelete={onDelete}
									categories={categories}
									tasks={tasks}
									isReply
									blockedUserIds={blockedUserIds}
									isOrgMember={isOrgMember}
								/>
							</li>
						))}
					</ul>
				)
			)}

			{/* Reply input */}
			{canAct && session?.user && (
				<PublicReplyInput
					parentComment={parentComment}
					categories={categories}
					tasks={tasks}
					onReplyPosted={() => refetch()}
					onPostReply={onPostReply}
				/>
			)}
		</div>
	);
}

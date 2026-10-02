import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { getDisplayName } from "@repo/util";
import { IconArrowBack, IconChevronDown, IconChevronUp, IconLoader2 } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { PortalAvatar } from "@/components/public/portal/ui/PortalAvatar";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { CreateTaskCommentAction, CreateTaskReactionAction, FetchCommentRepliesAction } from "@/lib/fetches/task";
import { extractTextContent } from "@/lib/util";
import { PublicCommentItem } from "./public-comment-item";
import type { CommentData } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/**
 * Collapsed thread trigger — rendered inside the parent comment's footer.
 * Shows "N replies" with overlapping avatars of unique reply authors.
 */
const MAX_VISIBLE_AVATARS = 3;

export function PublicCommentThreadTrigger({
	replyCount,
	replyAuthors,
	expanded,
	onToggle,
}: {
	replyCount: number;
	replyAuthors?: CommentData["replyAuthors"];
	expanded: boolean;
	onToggle: () => void;
}) {
	if (replyCount === 0 && !expanded) return null;

	const visibleAuthors = (replyAuthors ?? []).slice(0, MAX_VISIBLE_AVATARS);
	const overflowCount = (replyAuthors ?? []).length - MAX_VISIBLE_AVATARS;

	return (
		<button
			type="button"
			onClick={onToggle}
			aria-expanded={expanded}
			className="mt-2 flex min-h-8 w-fit max-md:min-h-11 cursor-pointer items-center gap-2 rounded-full pr-2 text-[13px] font-medium text-portal-fg-2 outline-none transition-colors hover:text-portal-fg"
		>
			{expanded ? (
				<IconChevronUp aria-hidden className="size-3.5" />
			) : (
				<IconChevronDown aria-hidden className="size-3.5" />
			)}
			{!expanded && visibleAuthors.length > 0 && (
				<span className="flex items-center -space-x-1.5">
					{visibleAuthors.map((author) => (
						<PortalAvatar
							key={author.id}
							name={getDisplayName(author)}
							image={author.image}
							size={20}
							className="border-2 border-portal-canvas"
						/>
					))}
					{overflowCount > 0 && (
						<span className="flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-portal-canvas bg-portal-raised px-1 font-medium text-portal-fg-2 text-xs">
							+{overflowCount}
						</span>
					)}
				</span>
			)}
			<span>
				{expanded ? "Hide" : replyCount} {replyCount === 1 ? "reply" : "replies"}
			</span>
		</button>
	);
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
}: {
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
}) {
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
		<div className="mt-3 border-l-2 border-portal-line pl-5">
			{isLoading ? (
				<div className="flex items-center gap-2 py-2 text-[13px] text-portal-fg-3">
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

// -------------------------------------------------------------------
// Compact reply input for the public board
// -------------------------------------------------------------------

function PublicReplyInput({
	parentComment,
	categories,
	tasks,
	onReplyPosted,
	onPostReply,
}: {
	parentComment: CommentData;
	categories?: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	onReplyPosted?: () => void;
	/** Optional custom post reply function (e.g., for release comments). */
	onPostReply?: (content: NodeJSON) => Promise<boolean>;
}) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const [content, setContent] = useState<undefined | NodeJSON>(undefined);
	const [editorKey, setEditorKey] = useState(0);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const commentText = extractTextContent(content);
	const disabled = isSubmitting || commentText.length === 0;

	const handleSubmit = useCallback(async () => {
		if (!content || isSubmitting || commentText.length === 0) return;

		setIsSubmitting(true);
		try {
			// Use custom post reply if provided (e.g., for release comments)
			if (onPostReply) {
				const success = await onPostReply(content);
				if (success) {
					setContent(undefined);
					setEditorKey((prev) => prev + 1);
					queryClient.invalidateQueries({
						queryKey: ["comment-replies", parentComment.id, parentComment.organizationId],
					});
					onReplyPosted?.();
				}
			} else {
				const result = await CreateTaskCommentAction(
					parentComment.organizationId,
					parentComment.taskId,
					content,
					"public",
					sseClientId,
					parentComment.id
				);
				if (result.success) {
					setContent(undefined);
					setEditorKey((prev) => prev + 1);
					// Refresh both replies and parent comments (for updated replyCount)
					queryClient.invalidateQueries({
						queryKey: ["comment-replies", parentComment.id, parentComment.organizationId],
					});
					queryClient.invalidateQueries({
						queryKey: ["public-comments", parentComment.taskId, parentComment.organizationId],
					});
					onReplyPosted?.();
				} else {
					headlessToast.error({
						title: "Failed to post reply",
						description: result.error || "Something went wrong.",
						id: "public-reply-error",
					});
				}
			}
		} catch {
			headlessToast.error({
				title: "Failed to post reply",
				description: "Could not post your reply. Please try again.",
				id: "public-reply-error",
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [content, isSubmitting, commentText, parentComment, sseClientId, queryClient, onReplyPosted, onPostReply]);

	const displayName = session?.user?.name ?? "User";

	return (
		<div className="mt-4 flex items-start gap-3 text-portal-fg">
			<PortalAvatar name={displayName} image={session?.user?.image} size={28} className="mt-1" />
			<div className="min-w-0 flex-1 rounded-portal-md border border-portal-line-2 bg-portal-surface px-3 py-2 focus-within:border-portal-focus">
				<Suspense fallback={<div className="h-8 animate-pulse rounded bg-portal-raised" />}>
					<Editor
						key={editorKey}
						onChange={setContent}
						categories={categories}
						tasks={tasks}
						submit={handleSubmit}
						hideBlockHandle
						firstLinePlaceholder="Write a reply..."
					/>
				</Suspense>
				<div className="mt-1 flex items-center justify-end">
					<PortalButton variant="primary" size="sm" disabled={disabled} onClick={handleSubmit}>
						{isSubmitting ? <IconLoader2 aria-hidden className="animate-spin" /> : <IconArrowBack aria-hidden />}
						Reply
					</PortalButton>
				</div>
			</div>
		</div>
	);
}

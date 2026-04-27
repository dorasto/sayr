import type { schema } from "@repo/database";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import {
	IconArrowBack,
	IconChevronDown,
	IconChevronUp,
	IconLoader2,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import {
	CreateTaskCommentAction,
	CreateTaskReactionAction,
	FetchCommentRepliesAction,
} from "@/lib/fetches/task";
import { extractTextContent } from "@/lib/util";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { PublicCommentItem } from "./public-comment-item";
import type { CommentData } from "./public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

/**
 * Collapsed thread trigger — rendered inside the parent comment card footer.
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
			className={cn(
				"flex items-center gap-2 pt-2 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-t border-border/50 w-full",
				replyCount === 0 && "pb-2",
			)}
		>
			{expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
			{!expanded && visibleAuthors.length > 0 && (
				<div className="flex items-center -space-x-1.5">
					{visibleAuthors.map((author) => (
						<Avatar key={author.id} className="size-5 border-2 border-background rounded-full">
							<AvatarImage src={author.image || ""} alt={getDisplayName(author)} />
							<AvatarFallback className="text-[8px] rounded-full">
								{getDisplayName(author).slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					))}
					{overflowCount > 0 && (
						<div className="size-5 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
							+{overflowCount}
						</div>
					)}
				</div>
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
	blockedUserIds,
	isOrgMember,
	canAct,
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
	blockedUserIds?: Set<string>;
	isOrgMember?: boolean;
	/** Whether the current user can perform write actions (comment, react, reply). */
	canAct?: boolean;
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
		return repliesRaw.map((r) => ({
			id: r.id,
			taskId: r.taskId ?? parentComment.taskId,
			organizationId: r.organizationId,
			content: r.content as NodeJSON,
			visibility: r.visibility as "public" | "internal",
			createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
			updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt ? String(r.updatedAt) : undefined,
			createdBy: (r as any).actor
				? {
					id: (r as any).actor.id,
					name: (r as any).actor.name,
					image: (r as any).actor.image,
					displayName: (r as any).actor.displayName ?? null,
				}
				: null,
			reactions: r.reactions as CommentData["reactions"],
			parentId: r.parentId ?? parentComment.id,
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

					const currentReactions = ((reply as { reactions?: { reactions?: Record<string, { count: number; users: string[] }> } }).reactions?.reactions ?? {}) as Record<string, { count: number; users: string[] }>;
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
					sseClientId,
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
		[session?.user?.id, parentComment.id, parentComment.organizationId, parentComment.taskId, queryClient, sseClientId],
	);

	return (
		<div>
			{isLoading ? (
				<div className="flex items-center gap-2 py-3 px-4">
					<IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					<Label variant="description">Loading replies...</Label>
				</div>
			) : (
				<div className="flex flex-col">
					{replies.map((reply, index) => (
						<div key={reply.id}>
							{index > 0 && <Separator className="opacity-50" />}
							<PublicCommentItem
								comment={reply}
								memberTeamName={
									reply.createdBy ? (memberHighestTeam.get(reply.createdBy.id) ?? null) : null
								}
								onToggleReaction={canAct ? handleReplyReaction : undefined}
								users={users}
								currentUserId={currentUserId}
								onEdit={onEdit}
								onDelete={onDelete}
								categories={categories}
								isReply
								blockedUserIds={blockedUserIds}
								isOrgMember={isOrgMember}
							/>
						</div>
					))}
				</div>
			)}

			{/* Reply input */}
			{canAct && session?.user && (
				<div className="-mb-3 -mx-3 overflow-hidden border-t">
					<PublicReplyInput
						parentComment={parentComment}
						categories={categories}
						onReplyPosted={() => refetch()}
						onPostReply={onPostReply}
					/>
				</div>
			)}
		</div>
	);
}

// -------------------------------------------------------------------
// Compact reply input for the public board
// -------------------------------------------------------------------

/** Check if ProseMirror doc JSON has more than one block-level content node */
function isMultiline(doc: NodeJSON | undefined): boolean {
	if (!doc?.content) return false;
	if (doc.content.length > 1) return true;
	const first = doc.content[0];
	if (first?.content) {
		return first.content.some((node) => node.type === "hardBreak");
	}
	return false;
}

function PublicReplyInput({
	parentComment,
	categories,
	onReplyPosted,
	onPostReply,
}: {
	parentComment: CommentData;
	categories?: schema.categoryType[];
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
	const multiline = useMemo(() => isMultiline(content), [content]);

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
					parentComment.id,
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

	const replyButton = (
		<Button variant="primary" size="icon" disabled={disabled} onClick={handleSubmit} className="h-7 w-7 shrink-0">
			{isSubmitting ? <IconLoader2 className="animate-spin" size={14} /> : <IconArrowBack size={14} />}
		</Button>
	);

	return (
		<div className="text-foreground transition-all flex gap-2 items-start px-3 py-2">
			<Avatar className="h-5 w-5 shrink-0 rounded-full mt-2">
				<AvatarImage src={session?.user?.image || "/avatar.jpg"} alt={displayName} />
				<AvatarFallback className="rounded-full bg-muted text-[10px] uppercase">
					{displayName.slice(0, 2)}
				</AvatarFallback>
			</Avatar>
			<div className={cn("flex-1 min-w-0", !multiline && "flex items-center gap-2")}>
				<div className={cn(!multiline && "flex-1 min-w-0")}>
					<Suspense fallback={<div className="h-8 animate-pulse bg-muted rounded" />}>
						<Editor
							key={editorKey}
							onChange={setContent}
							categories={categories}
							submit={handleSubmit}
							hideBlockHandle
							firstLinePlaceholder="Reply..."
						/>
					</Suspense>
				</div>
				{multiline ? <div className="flex items-center justify-end">{replyButton}</div> : replyButton}
			</div>
		</div>
	);
}

import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { useStateManagement, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTimeFromNow, getDisplayName } from "@repo/util";
import { IconLoader2, IconSend, IconShieldCheck } from "@tabler/icons-react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { authClient } from "@repo/auth/client";
import { CreateTaskCommentAction, CreateTaskReactionAction } from "@/lib/fetches/task";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { ReactionDisplay, type ReactionEmoji } from "@/components/tasks/task/timeline/reactions";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

interface PublicCommentsProps {
	taskId: string;
	organizationId: string;
}

interface CommentData {
	id: string;
	taskId: string;
	organizationId: string;
	content: NodeJSON;
	visibility: "public" | "internal";
	createdAt: string;
	updatedAt?: string;
	createdBy: { id: string; name: string; image: string | null; displayName?: string | null } | null;
	reactions?: {
		total: number;
		reactions: Record<string, { count: number; users: string[] }>;
	};
}

interface CommentsPage {
	data: CommentData[];
	pagination: {
		pageFromStart: number;
		pageFromEnd: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export function PublicComments({ taskId, organizationId }: PublicCommentsProps) {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const { organization, categories } = usePublicOrganizationLayout();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
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
		value: { data: commentsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage },
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
				const unique = Array.from(new Map(merged.map((i: CommentData) => [i.id, i])).values()).sort(
					(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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

		return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

			const previousData = queryClient.getQueryData<InfiniteData<CommentsPage>>(queryKey);

			queryClient.setQueryData<InfiniteData<CommentsPage>>(queryKey, (old) => {
				if (!old) return old;

				return {
					...old,
					pages: old.pages.map((page) => ({
						...page,
						data: page.data.map((comment) => {
							if (comment.id !== commentId) return comment;

							const currentReactions = comment.reactions?.reactions ?? {};
							const emojiData = currentReactions[emoji] ?? { count: 0, users: [] };
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

							const total = Object.values(newReactions).reduce((sum, r) => sum + r.count, 0);

							return {
								...comment,
								reactions: total > 0 ? { total, reactions: newReactions } : undefined,
							};
						}),
					})),
				};
			});

			try {
				await CreateTaskReactionAction(organizationId, taskId, commentId, emoji, wsClientId);
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

	const handleSubmitComment = useCallback(async () => {
		if (!commentContent || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const result = await CreateTaskCommentAction(organizationId, taskId, commentContent, "public", wsClientId);
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
	}, [commentContent, isSubmitting, organizationId, taskId, wsClientId, queryClient]);

	return (
		<div className="flex flex-col gap-4">
			<Label variant="heading" className="text-lg font-semibold">
				Comments
			</Label>

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
							isMember={!!comment.createdBy && memberUserIds.has(comment.createdBy.id)}
							onToggleReaction={session?.user ? handleToggleReaction : undefined}
							users={orgUsers}
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
							isMember={!!comment.createdBy && memberUserIds.has(comment.createdBy.id)}
							onToggleReaction={session?.user ? handleToggleReaction : undefined}
							users={orgUsers}
						/>
					))}
				</div>
			)}

			{/* Comment input */}
			{session?.user ? (
				<div className="flex flex-col gap-3 border rounded-lg p-4 bg-card">
					<div className="flex items-center gap-2">
						<Avatar className="size-6">
							<AvatarImage src={session.user.image || ""} alt={session.user.name} />
							<AvatarFallback className="text-xs">
								{session.user.name?.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<Label variant="description" className="text-sm font-medium">
							{session.user.name}
						</Label>
					</div>
					<Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded" />}>
						<Editor
							key={editorKey}
							placeholder="Write a comment..."
							className="min-h-[80px] border rounded-lg p-2 bg-background"
							onChange={setCommentContent}
							submit={handleSubmitComment}
							users={orgUsers}
							categories={categories}
							hideBlockHandle
						/>
					</Suspense>
					<div className="flex justify-end">
						<Button
							variant="primary"
							size="sm"
							onClick={handleSubmitComment}
							disabled={isSubmitting || !commentContent}
							className="gap-2"
						>
							{isSubmitting ? <IconLoader2 className="animate-spin size-4" /> : <IconSend className="size-4" />}
							Comment
						</Button>
					</div>
				</div>
			) : (
				<div className="border rounded-lg p-6 bg-card/50 border-dashed text-center">
					<p className="text-muted-foreground text-sm">Sign in to leave a comment.</p>
				</div>
			)}
		</div>
	);
}

interface PublicCommentItemProps {
	comment: CommentData;
	isMember: boolean;
	onToggleReaction?: (commentId: string, emoji: ReactionEmoji) => void;
	users: schema.userType[];
}

function PublicCommentItem({ comment, isMember, onToggleReaction, users }: PublicCommentItemProps) {
	const authorName = comment.createdBy ? getDisplayName(comment.createdBy) : "Anonymous";
	const reactions = comment.reactions?.reactions;
	const hasReactions = reactions && Object.keys(reactions).length > 0;

	return (
		<div
			className={cn(
				"flex gap-3 p-3 rounded-lg",
				isMember ? "bg-primary/5 border border-primary/15" : "bg-accent/50",
			)}
		>
			<Avatar className="size-8 shrink-0 mt-0.5">
				<AvatarImage src={comment.createdBy?.image || ""} alt={authorName} />
				<AvatarFallback className="text-xs">{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
			</Avatar>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<Label variant="description" className="text-sm font-medium">
						{authorName}
					</Label>
					{isMember && (
						<Tooltip delayDuration={200}>
							<TooltipTrigger asChild>
								<Badge
									variant="outline"
									className="gap-1 text-xs py-0 h-5 bg-primary/10 border-primary/20 text-primary"
								>
									<IconShieldCheck className="size-3" />
									Member
								</Badge>
							</TooltipTrigger>
							<TooltipContent side="top">
								<span className="text-xs">This user is a member of the organization</span>
							</TooltipContent>
						</Tooltip>
					)}
					<span className="text-xs text-muted-foreground">{formatDateTimeFromNow(comment.createdAt)}</span>
				</div>

				{comment.content && (
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<Suspense fallback={<div className="h-4 animate-pulse bg-muted rounded w-3/4" />}>
							<Editor readonly={true} defaultContent={comment.content} users={users} hideBlockHandle />
						</Suspense>
					</div>
				)}

				{/* Interactive reactions */}
				{(hasReactions || onToggleReaction) && (
					<div className="mt-1">
						{onToggleReaction ? (
							<ReactionDisplay
								reactions={reactions}
								toggleReaction={(emoji) => onToggleReaction(comment.id, emoji)}
								users={users}
							/>
						) : hasReactions ? (
							<div className="flex items-center gap-1 flex-wrap">
								{Object.entries(reactions).map(([emoji, info]) => (
									<span
										key={emoji}
										className={cn(
											"inline-flex items-center gap-1 h-6 px-2 text-sm rounded-full",
											"bg-accent/50 border border-border",
										)}
									>
										<span className="text-base leading-none">{emoji}</span>
										<span className="text-xs font-medium">{info.count}</span>
									</span>
								))}
							</div>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}

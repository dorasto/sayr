import type { schema, TeamPermissions } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { type InfiniteData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { useCallback, useMemo, useState } from "react";
import processUploads from "@/components/prosekit/upload";
import { PostCommentComposer } from "@/components/public/portal/post/CommentComposer";
import { useCanAct } from "@/components/public/portal/post/useCanAct";
import { publicCommentsKey, usePostComments } from "@/components/public/portal/post/usePostComments";
import { PortalButton } from "@/components/public/portal/ui/PortalButton";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getBlockedUserIdsAction } from "@/lib/fetches/organization";
import { CreateTaskReactionAction, DeleteTaskCommentAction, UpdateTaskCommentAction } from "@/lib/fetches/task";
import { PublicCommentItem } from "./public-comment-item";
import { PublicCommentThreadBody, PublicCommentThreadTrigger } from "./public-comment-thread";
import type { CommentData, CommentsPage } from "./public-comments-types";

/**
 * Score a team's permissions to determine hierarchy weight.
 * Higher score = higher rank. Admin perms are weighted most heavily.
 */
function scorePermissions(permissions: TeamPermissions): number {
	let score = 0;
	// Admin group (highest weight)
	if (permissions.admin.administrator) score += 100;
	if (permissions.admin.manageMembers) score += 50;
	if (permissions.admin.manageTeams) score += 50;
	// Moderation group
	if (permissions.moderation.manageComments) score += 20;
	if (permissions.moderation.approveSubmissions) score += 20;
	if (permissions.moderation.manageVotes) score += 20;
	// Tasks group
	if (permissions.tasks.editAny) score += 10;
	if (permissions.tasks.deleteAny) score += 10;
	if (permissions.tasks.create) score += 5;
	if (permissions.tasks.assign) score += 5;
	if (permissions.tasks.changeStatus) score += 5;
	if (permissions.tasks.changePriority) score += 5;
	// Content group
	if (permissions.content.manageCategories) score += 5;
	if (permissions.content.manageLabels) score += 5;
	if (permissions.content.manageViews) score += 5;
	return score;
}

interface PublicCommentsProps {
	taskId: string;
	organizationId: string;
	taskStatus: string;
	tasks?: schema.TaskWithLabels[];
	/** User id of the post's author — their comments get the Author pill. */
	authorId?: string | null;
}

/**
 * The Conversation section of a post: threaded comments (top-level, 10 at a time, replies nested one level), the
 * Conversation count, and the comment box / log in prompt. Realtime refreshes come from `PublicTaskProvider`
 * invalidating `publicCommentsKey`.
 */
export function PublicComments({
	taskId,
	organizationId,
	taskStatus,
	tasks: tasksProp,
	authorId,
}: PublicCommentsProps) {
	const queryClient = useQueryClient();
	const { organization, categories, tasks: tasksContext } = usePublicOrganizationLayout();
	const tasks = tasksProp ?? tasksContext;
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
	const { session, isOrgMember, canAct } = useCanAct(taskStatus);
	const { allComments, totalCount, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePostComments({
		taskId,
		organizationId,
	});

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

	// Build a map of userId -> highest team name (by permission weight)
	const memberHighestTeam = useMemo(() => {
		const map = new Map<string, string | null>();
		for (const m of organization.members) {
			const teams = m.teams;
			if (!teams || teams.length === 0) {
				// Member but no team assigned
				map.set(m.user.id, "Member");
				continue;
			}
			// Pick the team with the highest permission score
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

	// Map org members to a user array for mentions + reaction tooltips
	const orgUsers = useMemo(() => organization.members.map((m) => m.user) as schema.userType[], [organization.members]);

	// Fetch blocked user IDs (only for org members — endpoint returns 401 for non-members, action handles gracefully)
	const { data: blockedUserIdsArray } = useQuery({
		queryKey: ["blocked-user-ids", organizationId],
		queryFn: () => getBlockedUserIdsAction(organizationId),
		enabled: isOrgMember,
		staleTime: 60_000,
	});

	const blockedUserIds = useMemo(() => new Set(blockedUserIdsArray ?? []), [blockedUserIdsArray]);

	// Split at midpoint for outside-in rendering
	const halfway = Math.floor(allComments.length / 2);
	const topComments = allComments.slice(0, halfway);
	const bottomComments = allComments.slice(halfway);

	// Optimistic reaction toggle (mirrors admin timeline-comment.tsx pattern)
	const handleToggleReaction = useCallback(
		async (commentId: string, emoji: ReactionEmoji) => {
			if (!session?.user?.id) return;

			const queryKey = [...publicCommentsKey(taskId, organizationId)];
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
				await CreateTaskReactionAction(organizationId, taskId, commentId, emoji, sseClientId);
			} catch {
				queryClient.setQueryData(queryKey, previousData);
				headlessToast.error({
					title: "Reaction failed",
					description: "Could not update your reaction. Please try again.",
					id: "reaction-error",
				});
			}
		},
		[session?.user?.id, taskId, organizationId, queryClient, sseClientId]
	);

	const handleEditComment = useCallback(
		async (commentId: string, content: NodeJSON) => {
			try {
				const processedContent = await processUploads(content, "public", organizationId, "public-comment-edit");
				const result = await UpdateTaskCommentAction(
					organizationId,
					taskId,
					commentId,
					processedContent,
					"public",
					sseClientId
				);
				if (result.success) {
					queryClient.invalidateQueries({
						queryKey: publicCommentsKey(taskId, organizationId),
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
		[organizationId, taskId, sseClientId, queryClient]
	);

	const handleDeleteComment = useCallback(
		async (commentId: string) => {
			try {
				const result = await DeleteTaskCommentAction(organizationId, taskId, commentId, sseClientId);
				if (result.success) {
					queryClient.invalidateQueries({
						queryKey: publicCommentsKey(taskId, organizationId),
					});
					// Also remove cached replies for this comment (cascade delete)
					queryClient.removeQueries({
						queryKey: ["comment-replies", commentId, organizationId],
					});
					// Collapse the thread if it was expanded
					setExpandedThreads((prev) => {
						if (!prev.has(commentId)) return prev;
						const next = new Set(prev);
						next.delete(commentId);
						return next;
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
		[organizationId, taskId, sseClientId, queryClient]
	);

	const renderComment = (comment: CommentData) => {
		const replyCount = comment.replyCount ?? 0;
		const isExpanded = expandedThreads.has(comment.id);

		const threadFooter =
			replyCount > 0 || isExpanded ? (
				<>
					<PublicCommentThreadTrigger
						replyCount={replyCount}
						replyAuthors={comment.replyAuthors}
						expanded={isExpanded}
						onToggle={() => toggleThread(comment.id)}
					/>
					{isExpanded && (
						<PublicCommentThreadBody
							parentComment={comment}
							memberHighestTeam={memberHighestTeam}
							users={orgUsers}
							currentUserId={session?.user?.id}
							onEdit={canAct ? handleEditComment : undefined}
							onDelete={session?.user ? handleDeleteComment : undefined}
							categories={categories}
							tasks={tasks}
							blockedUserIds={blockedUserIds}
							isOrgMember={isOrgMember}
							canAct={canAct}
							authorId={authorId}
						/>
					)}
				</>
			) : undefined;

		return (
			<li key={comment.id}>
				<PublicCommentItem
					comment={comment}
					memberTeamName={comment.createdBy ? (memberHighestTeam.get(comment.createdBy.id) ?? null) : null}
					isAuthor={!!authorId && comment.createdBy?.id === authorId}
					onToggleReaction={canAct ? handleToggleReaction : undefined}
					users={orgUsers}
					currentUserId={session?.user?.id}
					onEdit={canAct ? handleEditComment : undefined}
					onDelete={session?.user ? handleDeleteComment : undefined}
					categories={categories}
					tasks={tasks}
					footer={threadFooter}
					onReply={
						canAct
							? () => {
									if (!expandedThreads.has(comment.id)) {
										toggleThread(comment.id);
									}
								}
							: undefined
					}
					blockedUserIds={blockedUserIds}
					isOrgMember={isOrgMember}
				/>
			</li>
		);
	};

	return (
		<section aria-labelledby="post-conversation-heading">
			<h2
				id="post-conversation-heading"
				className="mb-6 font-semibold text-portal-fg text-xl leading-7 tracking-[-0.018em]"
			>
				Conversation
				{totalCount > 0 && (
					<span className="ml-2 font-medium text-portal-fg-3 text-sm tracking-normal">{totalCount}</span>
				)}
			</h2>

			{isLoading ? (
				<div aria-busy className="flex flex-col gap-7">
					{[0, 1].map((key) => (
						<div key={key} className="flex gap-3">
							<Skeleton className="size-8 shrink-0 rounded-full bg-portal-raised" />
							<div className="flex-1 space-y-2 pt-1">
								<Skeleton className="h-3.5 w-32 bg-portal-raised" />
								<Skeleton className="h-3.5 w-4/5 bg-portal-raised" />
							</div>
						</div>
					))}
				</div>
			) : allComments.length === 0 ? (
				<p className="rounded-portal-lg border border-portal-line-2 border-dashed px-4 py-6 text-center text-[13.5px] text-portal-fg-2">
					No comments yet. Start the conversation.
				</p>
			) : (
				<ul className="flex flex-col gap-7">
					{/* Top (oldest) comments */}
					{topComments.map(renderComment)}

					{/* Load more in the middle */}
					{hasNextPage && (
						<li className="flex justify-center border-portal-line border-y border-dashed py-3">
							<PortalButton
								variant="ghost"
								className="w-full"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
							>
								{isFetchingNextPage ? (
									<>
										<IconLoader2 aria-hidden className="animate-spin" />
										Loading...
									</>
								) : (
									"Load more comments"
								)}
							</PortalButton>
						</li>
					)}

					{/* Bottom (newest) comments */}
					{bottomComments.map(renderComment)}
				</ul>
			)}

			<PostCommentComposer
				className="mt-8"
				taskId={taskId}
				organizationId={organizationId}
				taskStatus={taskStatus}
				tasks={tasks}
			/>
		</section>
	);
}

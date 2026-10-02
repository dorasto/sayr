import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { headlessToast } from "@repo/ui/components/headless-toast";
import {
	useStateManagement,
	useStateManagementFetch,
	useStateManagementInfiniteFetch,
} from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconArrowBack, IconLoader2, IconMessageCircle } from "@tabler/icons-react";
import { type InfiniteData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NodeJSON } from "prosekit/core";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import LoginDialog from "@/components/auth/login";
import processUploads from "@/components/prosekit/upload";
import type { ReactionEmoji } from "@/components/tasks/task/timeline/reactions";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useIsOrgMember } from "@/hooks/useIsOrgMember";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { getBlockedUserIdsAction } from "@/lib/fetches/organization";
import {
	addReleaseCommentReactionAction,
	createReleaseCommentAction,
	deleteReleaseCommentAction,
	removeReleaseCommentReactionAction,
	updateReleaseCommentAction,
} from "@/lib/fetches/release";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { PublicCommentItem } from "../public-comment-item";
import { PublicCommentThreadBody } from "../public-comment-thread-body";
import { PublicCommentThreadTrigger } from "../public-comment-thread-trigger";
import type { CommentData } from "../public-comments-types";

const Editor = lazy(() => import("@/components/prosekit/editor"));

const basePublicApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/public/v1" : "/api/public/v1";
const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

const COMMENT_LIMIT = 20;

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
 * Release comments reuse the post comment components, which are typed around `CommentData`. The release id stands in
 * for `taskId` (these components only read it to scope reactions on replies).
 */
function toCommentData(comment: ReleaseCommentData): CommentData {
	return {
		id: comment.id,
		taskId: comment.releaseId,
		organizationId: comment.organizationId,
		content: comment.content as NodeJSON,
		visibility: comment.visibility,
		createdAt: comment.createdAt,
		updatedAt: comment.updatedAt,
		createdBy: comment.createdBy,
		reactions: comment.reactions,
		parentId: comment.parentId,
		replyCount: comment.replyCount,
		replyAuthors: comment.replyAuthors,
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

interface PublicReleaseDiscussionProps {
	releaseId: string;
	releaseSlug: string;
	organizationId: string;
	orgSlug: string;
}

/** Release discussion: top-level comments (paged from both ends), reply threads, reactions and the comment box. */
export function PublicReleaseDiscussion({
	releaseId,
	releaseSlug,
	organizationId,
	orgSlug,
}: PublicReleaseDiscussionProps) {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const { organization, categories, tasks: contextTasks, serverEvents } = usePublicOrganizationLayout();
	const { value: sseClientId } = useStateManagement<string>("sseClientId", "");
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const [commentContent, setCommentContent] = useState<NodeJSON | undefined>(undefined);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editorKey, setEditorKey] = useState(0);
	// Threads the user opened or hid by hand; any other thread is open when it has replies.
	const [threadOverrides, setThreadOverrides] = useState<Map<string, boolean>>(new Map());

	// Fetch public tasks for this org if context tasks are empty
	const {
		value: { data: fetchedTasks },
	} = useStateManagementFetch<schema.TaskWithLabels[]>({
		key: ["org-public-tasks", organizationId],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/tasks?org_id=${organizationId}&limit=50`,
			custom: async (url: string) => {
				const res = await fetch(url);
				if (!res.ok) return [];
				const json = await res.json();
				return json.data ?? [];
			},
		},
		staleTime: 1000 * 60 * 5,
		enabled: contextTasks.length === 0,
	});

	const tasks = contextTasks.length > 0 ? contextTasks : (fetchedTasks ?? []);

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

	const orgUsers = useMemo(() => organization.members.map((m) => m.user) as schema.userType[], [organization.members]);

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

	const blockedUserIds = useMemo(() => new Set(blockedUserIdsArray ?? []), [blockedUserIdsArray]);

	const {
		value: { data: commentsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage },
	} = useStateManagementInfiniteFetch<ReleaseCommentsPage>({
		key: ["public-release-comments", releaseId, organizationId],
		fetch: {
			url: `${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/comments`,
			custom: async (url, pageParam) => {
				const { fromStart = 1, fromEnd } = pageParam ?? {};

				const firstUrl = `${url}?page=${fromStart}&limit=${COMMENT_LIMIT / 2}&direction=asc`;
				const firstRes = await fetch(firstUrl);
				if (!firstRes.ok) throw new Error(`Failed: ${firstRes.statusText}`);
				const firstData = await firstRes.json();

				const totalPages = Number(firstData.data?.pagination?.totalPages ?? 1);
				const endPage = fromEnd ?? totalPages;

				let lastData = { data: { comments: [] } };
				if (endPage !== fromStart) {
					const lastUrl = `${url}?page=${endPage}&limit=${COMMENT_LIMIT / 2}&direction=asc`;
					const lastRes = await fetch(lastUrl);
					if (lastRes.ok) lastData = await lastRes.json();
				}

				const merged = [...(firstData.data?.comments || []), ...(lastData.data?.comments || [])];
				const unique = Array.from(new Map(merged.map((i: ReleaseCommentData) => [i.id, i])).values()).sort(
					(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

		return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}, [commentsData]);

	// SSE handlers for real-time updates on this release
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASE_COMMENTS: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id && msg.data.releaseId === releaseId) {
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
		if (organizationId) {
			setMentionContext({ orgId: organizationId, orgShortId: organization.shortId, releaseId });
		}
	}, [organizationId, organization.shortId, releaseId, setMentionContext]);

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

	const setThreadExpanded = useCallback((commentId: string, expanded: boolean) => {
		setThreadOverrides((prev) => new Map(prev).set(commentId, expanded));
	}, []);

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
			const hasReacted = target?.reactions?.reactions?.[emoji]?.users.includes(userId) ?? false;

			const previousData = queryClient.getQueryData<InfiniteData<ReleaseCommentsPage>>(queryKey);

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
				if (hasReacted) {
					await removeReleaseCommentReactionAction(releaseId, commentId, emoji);
				} else {
					await addReleaseCommentReactionAction(organizationId, releaseId, commentId, emoji, sseClientId);
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
		[session?.user?.id, releaseId, organizationId, queryClient, sseClientId, allComments]
	);

	const handleEditComment = useCallback(
		async (commentId: string, content: NodeJSON) => {
			try {
				const processedContent = await processUploads(
					content,
					"public",
					organizationId,
					"public-release-comment-edit"
				);
				const result = await updateReleaseCommentAction(
					organizationId,
					releaseId,
					commentId,
					{ content: processedContent },
					sseClientId
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
		[organizationId, releaseId, sseClientId, queryClient]
	);

	const handleDeleteComment = useCallback(
		async (commentId: string) => {
			try {
				const result = await deleteReleaseCommentAction(organizationId, releaseId, commentId);
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
		[organizationId, releaseId, queryClient]
	);

	const handleSubmitComment = useCallback(async () => {
		if (!commentContent || isSubmitting) return;

		setIsSubmitting(true);
		try {
			const processedContent = await processUploads(
				commentContent,
				"public",
				organizationId,
				"public-release-comment-upload"
			);
			const result = await createReleaseCommentAction(
				organizationId,
				releaseId,
				{ content: processedContent, visibility: "public" },
				sseClientId
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
	}, [commentContent, isSubmitting, organizationId, releaseId, sseClientId, queryClient]);

	// Fetch replies for a comment from the public API
	const fetchReplies = useCallback(
		async (commentId: string) => {
			const res = await fetch(
				`${basePublicApiUrl}/organization/${orgSlug}/releases/${releaseSlug}/comments/${commentId}/replies`
			);
			if (!res.ok) return [];
			const data = await res.json();
			return data.data?.replies ?? [];
		},
		[orgSlug, releaseSlug]
	);

	// Post a reply to a comment
	const handlePostReply = useCallback(
		async (parentId: string, content: NodeJSON) => {
			try {
				const processedContent = await processUploads(
					content,
					"public",
					organizationId,
					"public-release-reply-upload"
				);
				const result = await createReleaseCommentAction(
					organizationId,
					releaseId,
					{ content: processedContent, visibility: "public", parentId },
					sseClientId
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
		[organizationId, releaseId, sseClientId, queryClient]
	);

	const renderComment = (comment: ReleaseCommentData) => {
		const replyCount = comment.replyCount ?? 0;
		const isExpanded = threadOverrides.get(comment.id) ?? replyCount > 0;

		const threadFooter =
			replyCount > 0 || isExpanded ? (
				<>
					<PublicCommentThreadTrigger
						replyCount={replyCount}
						replyAuthors={comment.replyAuthors}
						expanded={isExpanded}
						onToggle={() => setThreadExpanded(comment.id, !isExpanded)}
					/>
					{isExpanded && (
						<PublicCommentThreadBody
							parentComment={toCommentData(comment)}
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
							fetchReplies={() => fetchReplies(comment.id)}
							onPostReply={(content) => handlePostReply(comment.id, content)}
						/>
					)}
				</>
			) : undefined;

		return (
			<PublicCommentItem
				key={comment.id}
				comment={toCommentData(comment)}
				memberTeamName={comment.createdBy ? (memberHighestTeam.get(comment.createdBy.id) ?? null) : null}
				onToggleReaction={canAct ? handleToggleReaction : undefined}
				users={orgUsers}
				currentUserId={session?.user?.id}
				onEdit={canAct ? handleEditComment : undefined}
				onDelete={session?.user ? handleDeleteComment : undefined}
				categories={categories}
				tasks={tasks}
				footer={threadFooter}
				onReply={canAct && !isExpanded ? () => setThreadExpanded(comment.id, true) : undefined}
				blockedUserIds={blockedUserIds}
				isOrgMember={isOrgMember}
			/>
		);
	};

	return (
		<div className="flex flex-col gap-6">
			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<IconLoader2 aria-hidden className="animate-spin text-muted-foreground" />
				</div>
			) : allComments.length === 0 ? (
				<div className="rounded-xl border border-dashed px-5 py-6 text-center text-[13.5px] text-muted-foreground">
					No comments yet. Start the conversation.
				</div>
			) : (
				<div className="flex flex-col gap-[26px]">
					{topComments.map(renderComment)}

					{hasNextPage && (
						<div className="flex justify-center border-y border-dashed py-3">
							<Button
								variant="ghost"
								size="sm"
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
							</Button>
						</div>
					)}

					{bottomComments.map(renderComment)}
				</div>
			)}

			{canAct ? (
				<div className={cn("overflow-hidden rounded-xl border bg-background", "focus-within:border-primary")}>
					<Suspense fallback={<div className="h-20 animate-pulse bg-muted" />}>
						<Editor
							key={editorKey}
							firstLinePlaceholder="Write a comment..."
							className="bg-transparent p-3 pb-0"
							onChange={setCommentContent}
							submit={handleSubmitComment}
							categories={categories}
							tasks={tasks}
							hideBlockHandle
						/>
					</Suspense>
					<div className="flex items-center justify-end px-3 pb-3">
						<Button size="sm" onClick={handleSubmitComment} disabled={isSubmitting || !commentContent}>
							{isSubmitting ? (
								<IconLoader2 aria-hidden className="animate-spin" />
							) : (
								<IconArrowBack aria-hidden />
							)}
							Comment
						</Button>
					</div>
				</div>
			) : !session?.user ? (
				<Card className="rounded-xl p-5">
					<div className="flex items-center gap-4">
						<span
							aria-hidden
							className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
						>
							<IconMessageCircle className="size-5" />
						</span>
						<div className="min-w-0 flex-1">
							<div className="font-semibold text-[15px] text-foreground">Log in to join the discussion</div>
							<div className="mt-0.5 text-[13.5px] text-muted-foreground">
								Use your Sayr account. It takes a few seconds.
							</div>
						</div>
						<LoginDialog trigger={<Button size="sm">Log in</Button>} />
					</div>
				</Card>
			) : (
				<Card className="rounded-xl p-5">
					<p className="text-center text-[13.5px] text-muted-foreground">
						This organization has turned off public actions, so comments are read only.
					</p>
				</Card>
			)}
		</div>
	);
}

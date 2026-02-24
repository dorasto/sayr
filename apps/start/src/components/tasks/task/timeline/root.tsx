import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Timeline } from "@repo/ui/components/tomui/timeline";
import { useStateManagementFetch, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskNewCommentContent } from "../comment/new";
import { CommentThreadTrigger, CommentThreadBody } from "./comment-thread";
import { TimelineCategoryChange } from "./category-change";
import { TimelineReleaseChange } from "./release-change";
import {
	ConsolidatedTimelineItem,
	TimelineAssigneeAdded,
	TimelineAssigneeRemoved,
	TimelineComment,
	TimelineCreated,
	TimelineGithubCommit,
	TimelineGithubPRClosed,
	TimelineGithubPRCommit,
	TimelineGithubPRLinked,
	TimelineLabelAdded,
	TimelineLabelRemoved,
	TimelinePriorityChange,
	TimelineStatusChange,
	TimelineUpdated,
} from "./index";
import type { GlobalTimelineProps } from "./types";
import { consolidateTimelineItems } from "./utils";
const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";
export default function GlobalTimeline({
	task,
	labels,
	availableUsers,
	categories,
	tasks,
	releases,
	organization,
}: GlobalTimelineProps) {
	const queryClient = useQueryClient();
	const commentLimit = 20;
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

	const timelineComponents = {
		created: TimelineCreated,
		status_change: TimelineStatusChange,
		priority_change: TimelinePriorityChange,
		comment: TimelineComment,
		label_added: TimelineLabelAdded,
		label_removed: TimelineLabelRemoved,
		assignee_added: TimelineAssigneeAdded,
		assignee_removed: TimelineAssigneeRemoved,
		updated: TimelineUpdated,
		category_change: TimelineCategoryChange,
		release_change: TimelineReleaseChange,
		github_commit_ref: TimelineGithubCommit,
		github_pr_linked: TimelineGithubPRLinked,
		github_pr_commit: TimelineGithubPRCommit,
		github_pr_merged: TimelineGithubPRClosed,
	};

	// --- ACTIVITY FETCH ---
	const { value: activity } = useStateManagementFetch<
		schema.taskTimelineWithActor[],
		Partial<schema.taskTimelineWithActor>
	>({
		key: ["timeline", "activity", task.id, task.organizationId],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/timeline/activity?org_id=${task.organizationId}&task_id=${task.id}`,
			custom: async (url) => {
				const res = await fetch(url, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				const data = await res.json();
				return data.data;
			},
		},
		staleTime: 1000,
		gcTime: 2000 * 60,
		refetchOnWindowFocus: false,
	});
	// --- COMMENTS FETCH (infinite) ---
	const { value: comments } = useStateManagementInfiniteFetch<
		{
			data: schema.taskTimelineWithActor[];
			pagination?: {
				pageFromStart: number;
				pageFromEnd: number;
				totalPages: number;
				hasMore: boolean;
			};
		},
		Partial<schema.taskTimelineWithActor>
	>({
		key: ["timeline", "comments", task.id, task.organizationId],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/timeline/comments?org_id=${task.organizationId
				}&task_id=${task.id}&limit=${commentLimit / 2}`,
			custom: async (url, pageParam) => {
				// pageParam manages current outer pages
				const { fromStart = 1, fromEnd } = pageParam ?? {};

				// 1. get totalPages (once) using fromStart page
				const firstUrl = `${url}&page=${fromStart}`;
				const firstRes = await fetch(firstUrl, { credentials: "include" });
				if (!firstRes.ok) throw new Error(`Failed: ${firstRes.statusText}`);
				const firstData = await firstRes.json();

				// totalPages known from first response
				const totalPages = Number(firstData.pagination?.totalPages ?? 1);
				const endPage = fromEnd ?? totalPages;

				// 2. if same (only 1 page total), skip second fetch
				let lastData = { data: [] };
				if (endPage !== fromStart) {
					const lastUrl = `${url}&page=${endPage}`;
					const lastRes = await fetch(lastUrl, { credentials: "include" });
					if (lastRes.ok) lastData = await lastRes.json();
				}

				const merged = [...(firstData.data || []), ...(lastData.data || [])];
				const unique = Array.from(new Map(merged.map((i) => [i.id, i])).values()).sort(
					(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
				);

				const nextStart = fromStart + 1;
				const nextEnd = endPage - 1;
				const hasMore = nextStart <= nextEnd;

				console.log("🟩 Outside‑in batch", {
					fromStart,
					fromEnd: endPage,
					nextStart,
					nextEnd,
					hasMore,
					merged: unique.length,
				});

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
		staleTime: 1000,
		gcTime: 2000 * 60,
		refetchOnWindowFocus: false,
	});

	const hasTimelineData = Boolean(activity.data?.length) || Boolean(comments.data?.length);
	const showInitialLoading = (activity.isLoading || comments.isLoading) && !hasTimelineData;

	// --- Update on external timeline updates ---
	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string; payload: string }>("*", (msg) => {
			if (msg.type === "timeline-update" && msg.payload === task.id) {
				activity.refetch();
			}
			if (msg.type === "timeline-update-comment" && msg.payload === task.id) {
				queryClient.invalidateQueries({
					queryKey: ["timeline", "comments", task.id, task.organizationId],
				});
				// Also invalidate any expanded reply threads so other users' replies/reactions show in real time
				queryClient.invalidateQueries({
					predicate: (query) =>
						query.queryKey[0] === "comment-replies" &&
						query.queryKey[2] === task.organizationId,
				});
			}
		});
		return unsubscribe;
	}, [activity.refetch, task.id, queryClient, task.organizationId]);

	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
			if (msg.type === "WS_RECONNECTED") {
				console.log("🟢 Global WS reconnected — refreshing data");
				activity.refetch();
				queryClient.invalidateQueries({
					queryKey: ["timeline", "comments", task.id, task.organizationId],
				});
				queryClient.invalidateQueries({
					predicate: (query) =>
						query.queryKey[0] === "comment-replies" &&
						query.queryKey[2] === task.organizationId,
				});
			}
		});
		return unsubscribe;
	}, [activity.refetch, task.id, queryClient, task.organizationId]);
	// --- Flatten comments from all pages ---
	const flattenedComments = useMemo(() => {
		if (!comments.data) return [];
		const seen = new Set<string>();
		const result: schema.taskTimelineWithActor[] = [];

		for (let i = comments.data.length - 1; i >= 0; i--) {
			const page = comments.data[i];
			for (const item of page?.data ?? []) {
				if (!item?.id || seen.has(item.id)) continue;
				seen.add(item.id);
				result.push(item);
			}
		}

		return result;
	}, [comments.data]);
	// --- Determine visible date range (oldest + newest) ---
	const { oldestCommentTime, newestCommentTime } = useMemo(() => {
		if (flattenedComments.length === 0) return { oldestCommentTime: null, newestCommentTime: null };

		const times = flattenedComments.map((c) => new Date(c.createdAt || 0).getTime());
		return {
			oldestCommentTime: Math.min(...times),
			newestCommentTime: Math.max(...times),
		};
	}, [flattenedComments]);

	// Include all activity inside, before, or after the visible comment date range
	const visibleActivity = useMemo(() => {
		if (!activity.data || !oldestCommentTime || !newestCommentTime) return activity.data || [];

		const now = Date.now();
		const FUTURE_ALLOWANCE_MS = 5 * 60 * 1000; // 5 minutes

		return activity.data.filter((a) => {
			const t = new Date(a.createdAt || 0).getTime();
			// Include everything from before the oldest comment up to 5 minutes in the future
			return t <= now + FUTURE_ALLOWANCE_MS;
		});
	}, [activity.data, oldestCommentTime, newestCommentTime]);

	// --- Merge combined + filtered items ---
	const combinedData = [...visibleActivity, ...flattenedComments];

	const consolidatedItems = consolidateTimelineItems(combinedData).sort(
		(a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
	);

	// --- Split for mid‑timeline button placement ---
	const halfway = Math.floor(consolidatedItems.length / 2);
	const topItems = consolidatedItems.slice(0, halfway);
	const bottomItems = consolidatedItems.slice(halfway);
	// Helper to check if an item is an activity (not a comment)
	// biome-ignore lint/suspicious/noExplicitAny: <dont care>
	const isActivityItem = (item: any) => {
		if ("items" in item) return true; // Consolidated items are activities
		return item.eventType !== "comment";
	};

	// biome-ignore lint/suspicious/noExplicitAny: <dont care>
	const renderItem = (item: any, index: number, array: any[]) => {
		const nextItem = array[index + 1];
		const showSeparator = nextItem ? isActivityItem(nextItem) : false;

		if ("items" in item) {
			return (
				<ConsolidatedTimelineItem
					key={item.id}
					consolidatedItem={item}
					labels={labels}
					availableUsers={availableUsers}
					showSeparator={showSeparator}
					organization={organization}
				/>
			);
		}

		const TimelineComponent = timelineComponents[item.eventType as keyof typeof timelineComponents];
		if (!TimelineComponent) return null;

		const isComment = item.eventType === "comment";
		const replyCount = isComment ? (item.replyCount ?? 0) : 0;
		const replyAuthors = isComment ? (item.replyAuthors ?? []) : [];
		const isThreadExpanded = isComment && expandedThreads.has(item.id);

		return (
			<TimelineComponent
				key={item.id}
				item={item}
				labels={labels}
				availableUsers={availableUsers}
				categories={categories}
				tasks={tasks}
				releases={releases}
				showSeparator={showSeparator}
				organization={organization}
				{...(isComment
					? {
						onReply: () => toggleThread(item.id),
						footer:
							replyCount > 0 || isThreadExpanded ? (
								<>
									<CommentThreadTrigger
										replyCount={replyCount}
										replyAuthors={replyAuthors}
										expanded={isThreadExpanded}
										onToggle={() => toggleThread(item.id)}
									/>
									{isThreadExpanded && (
										<CommentThreadBody
											parentComment={item}
											availableUsers={availableUsers}
											categories={categories}
											tasks={tasks}
											organization={organization}
										/>
									)}
								</>
							) : undefined,
					}
					: {})}
			/>
		);
	};

	return (
		<div className="relative h-full w-full flex flex-col min-h-0">
			{showInitialLoading ? (
				<div className="flex min-h-full items-center justify-center py-6">
					<IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					<div className="grow">
						<Timeline>
							{/* top half */}
							{topItems.map(renderItem)}
							{/* load more middle button */}
							{comments.hasNextPage && (
								<div className="flex justify-center py-12 my-12 border-t border-b">
									<Button
										onClick={() => comments.fetchNextPage?.()}
										disabled={comments.isFetchingNextPage}
										// className="px-4 py-2 text-sm rounded bg-accent text-accent-foreground hover:opacity-80 disabled:opacity-50 transition"
										variant={"primary"}
									>
										{comments.isFetchingNextPage ? "Loading more..." : "Load more"}
									</Button>
								</div>
							)}
							{/* bottom half */}
							{bottomItems.map(renderItem)}
						</Timeline>
					</div>

					<div className="py-4 mt-auto">
						<TaskNewCommentContent
							task={task}
							onFinish={async () => {
								queryClient.invalidateQueries({
									queryKey: ["timeline", "comments", task.id, task.organizationId],
								});
							}}
							categories={categories}
							tasks={tasks}
						/>
					</div>
				</>
			)}
		</div>
	);
}

export { AvatarWithName } from ".";
export type { ConsolidatedTimelineItem, GlobalTimelineProps } from "./types";
export { consolidateTimelineItems } from "./utils";

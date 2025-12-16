import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Timeline } from "@repo/ui/components/tomui/timeline";
import { useStateManagementFetch, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { TaskNewCommentContent } from "../comment/new";
import { TimelineCategoryChange } from "./category-change";
import {
	ConsolidatedTimelineItem,
	TimelineAssigneeAdded,
	TimelineAssigneeRemoved,
	TimelineComment,
	TimelineCreated,
	TimelineLabelAdded,
	TimelineLabelRemoved,
	TimelinePriorityChange,
	TimelineStatusChange,
	TimelineUpdated,
} from "./index";
import type { GlobalTimelineProps } from "./types";
import { consolidateTimelineItems } from "./utils";

export default function GlobalTimeline({ task, labels, availableUsers, categories }: GlobalTimelineProps) {
	const queryClient = useQueryClient();
	const commentLimit = 20;
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
	};

	// --- ACTIVITY FETCH ---
	const { value: activity } = useStateManagementFetch<
		schema.taskTimelineWithActor[],
		Partial<schema.taskTimelineWithActor>
	>({
		key: ["timeline", "activity", task.id, task.organizationId],
		fetch: {
			url: `${import.meta.env.VITE_EXTERNAL_API_URL}/admin/organization/task/timeline/activity?org_id=${task.organizationId}&task_id=${task.id}`,
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
			url: `${import.meta.env.VITE_EXTERNAL_API_URL}/admin/organization/task/timeline/comments?org_id=${
				task.organizationId
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

		return activity.data.filter((a) => {
			const t = new Date(a.createdAt || 0).getTime();
			// Include everything from before the oldest comment up to the present,
			// but only trim activity that is way in the future (just in case clocks differ)
			return t <= now;
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
	// biome-ignore lint/suspicious/noExplicitAny: <dont care>
	const renderItem = (item: any) => {
		if ("items" in item) {
			return (
				<ConsolidatedTimelineItem
					key={item.id}
					consolidatedItem={item}
					labels={labels}
					availableUsers={availableUsers}
				/>
			);
		}

		const TimelineComponent = timelineComponents[item.eventType as keyof typeof timelineComponents];
		if (!TimelineComponent) return null;

		return (
			<TimelineComponent
				key={item.id}
				item={item}
				labels={labels}
				availableUsers={availableUsers}
				categories={categories}
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
							availableUsers={availableUsers}
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

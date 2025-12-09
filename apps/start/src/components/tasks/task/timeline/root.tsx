import type { schema } from "@repo/database";
import { Timeline } from "@repo/ui/components/tomui/timeline";
import { useStateManagementFetch, useStateManagementInfiniteFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { TaskNewCommentContent } from "../comment/new";
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
import { TimelineCategoryChange } from "./category-change";
import type { GlobalTimelineProps } from "./types";
import { consolidateTimelineItems } from "./utils";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";

export default function GlobalTimeline({ task, labels, availableUsers, categories }: GlobalTimelineProps) {
	const queryClient = useQueryClient();
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
		{ data: schema.taskTimelineWithActor[]; pagination?: {
			hasMore:boolean;
			page:number;
		} },
		Partial<schema.taskTimelineWithActor>
	>({
		key: ["timeline", "comments", task.id, task.organizationId],
		fetch: {
			url: `${import.meta.env.VITE_EXTERNAL_API_URL}/admin/organization/task/timeline/comments?org_id=${task.organizationId}&task_id=${task.id}&limit=5`,
			custom: async (url, pageParam) => {
				const pageUrl = pageParam && pageParam > 1 ? `${url}&page=${pageParam}` : url;
				const res = await fetch(pageUrl, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				const data = await res.json();
				return data; // { data, pagination }
			},
			getNextPageParam: (lastPage) => (lastPage.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined),
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
	const allCommentPages = comments.data ?? [];
	const flattenedComments = [...allCommentPages].reverse().flatMap((page) => page.data);

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
		if (!activity.data || !oldestCommentTime || !newestCommentTime) return [];
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
	const renderItem = (item:any) => {
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
					<div className="flex-grow overflow-y-auto">
						<Timeline>
							{/* top half */}
							{topItems.map(renderItem)}

							{/* load more middle button */}
							{comments.hasNextPage && (
								<div className="flex justify-center py-4">
									<Button
										onClick={() => comments.fetchNextPage?.()}
										disabled={comments.isFetchingNextPage}
										className="px-4 py-2 text-sm rounded bg-accent text-accent-foreground hover:opacity-80 disabled:opacity-50 transition"
									>
										{comments.isFetchingNextPage ? "Loading more..." : "Load comments"}
									</Button>
								</div>
							)}

							{/* bottom half */}
							{bottomItems.map(renderItem)}
						</Timeline>
					</div>

					<div className="py-4 mt-auto border-t border-border bg-background">
						<TaskNewCommentContent
							task={task}
							onFinish={async () => {
								// Refetch comments (all pages)
								queryClient.invalidateQueries({
									queryKey: ["timeline", "comments", task.id, task.organizationId],
								});
							}}
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

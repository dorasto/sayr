import type { schema } from "@repo/database";
import { Timeline } from "@repo/ui/components/tomui/timeline";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
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
} from ".";
import type { GlobalTimelineProps } from "./types";
import { consolidateTimelineItems } from "./utils";

export default function GlobalTimeline({ task, labels, availableUsers }: GlobalTimelineProps) {
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
	};
	const { value } = useStateManagementFetch<schema.taskTimelineWithActor[], Partial<schema.taskTimelineWithActor>>({
		key: ["timeline", task.id],
		fetch: {
			url: `${process.env.NEXT_PUBLIC_EXTERNAL_API_URL}/admin/organization/project/task/timeline?org_id=${task.organizationId}&project_id=${task.projectId}&task_id=${task.id}`,
			custom: async (url) => {
				const res = await fetch(url, { credentials: "include" });
				if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
				const data = await res.json();
				return data.data; // { comments, pagination }
			},
		},
		staleTime: 1000,
		gcTime: 2000 * 60, // 2 min
		refetchOnWindowFocus: false,
	});

	const hasTimelineData = Boolean(value.data?.length);
	const showInitialLoading = value.isLoading && !hasTimelineData;

	useEffect(() => {
		const unsubscribe = onWindowMessage<{
			type: string;
			payload: string;
		}>("*", (msg) => {
			if (msg.type === "timeline-update" && msg.payload === task.id) {
				value.refetch();
			}
		});
		return unsubscribe;
	}, [value.refetch, task.id]);
	// Consolidate timeline items
	const consolidatedItems = consolidateTimelineItems(value.data || []).sort(
		(a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
	);

	return (
		<div className="relative h-full w-full">
			{showInitialLoading ? (
				<div className="flex min-h-full items-center justify-center py-6">
					<IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					<Timeline>
						{consolidatedItems.map((item) => {
							// Check if it's a consolidated item
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

							// Handle individual items
							const TimelineComponent = timelineComponents[item.eventType as keyof typeof timelineComponents];

							if (!TimelineComponent) {
								return null;
							}

							return (
								<TimelineComponent key={item.id} item={item} labels={labels} availableUsers={availableUsers} />
							);
						})}
					</Timeline>
					<div className="py-4">
						<TaskNewCommentContent task={task} onFinish={() => value.refetch()} />
					</div>
				</>
			)}
		</div>
	);
}

export { AvatarWithName } from ".";
// Re-export types and utilities for external use
export type { ConsolidatedTimelineItem, GlobalTimelineProps } from "./types";
export { consolidateTimelineItems } from "./utils";

import { Timeline } from "@repo/ui/components/tomui/timeline";
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

	// Consolidate timeline items
	const consolidatedItems = consolidateTimelineItems(task.timeline || []);

	return (
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

				return <TimelineComponent key={item.id} item={item} labels={labels} availableUsers={availableUsers} />;
			})}
		</Timeline>
	);
}

export { AvatarWithName } from ".";
// Re-export types and utilities for external use
export type { ConsolidatedTimelineItem, GlobalTimelineProps } from "./types";
export { consolidateTimelineItems } from "./utils";

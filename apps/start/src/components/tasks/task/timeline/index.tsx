// Timeline components index

// Base components
export { AvatarWithName, TimelineItemWrapper } from "./base";

// Consolidated timeline components
export {
  ConsolidatedTimelineAssignees,
  ConsolidatedTimelineItem,
  ConsolidatedTimelineLabels,
} from "./consolidated-timeline";

// Individual timeline components
export { TimelineCreated } from "./timeline-created";
export { TimelineStatusChange } from "./timeline-status-change";
export { TimelinePriorityChange } from "./timeline-priority-change";
export { TimelineComment } from "./timeline-comment";
export { TimelineLabelAdded, TimelineLabelRemoved } from "./timeline-label";
export {
  TimelineAssigneeAdded,
  TimelineAssigneeRemoved,
} from "./timeline-assignee";
export { TimelineUpdated } from "./timeline-updated";
export { TimelineCategoryChange } from "./category-change";

// Root component
export { default as GlobalTimeline } from "./root";

// Types
export type {
  ConsolidatedTimelineItem as ConsolidatedTimelineItemType,
  TimelineItemWrapperProps,
  GlobalTimelineProps,
  TimelineItemProps,
  ConsolidatedTimelineItemProps,
} from "./types";

// Utilities
export { consolidateTimelineItems } from "./utils";

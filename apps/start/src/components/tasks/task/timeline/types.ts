import type { schema } from "@repo/database";
import type { NodeJSON } from "prosekit/core";

export type ConsolidatedTimelineItem = {
  id: string;
  actor: schema.taskTimelineWithActor["actor"];
  createdAt: Date;
  items: schema.taskTimelineWithActor[];
  eventTypes: string[];
};

/**
 * Timeline item variants:
 * - "activity": Shows timeline indicator (icon) and separator line - for status changes, assignments, etc.
 * - "comment": Shows content card without timeline indicator - for comments that flow inline
 * - "description": Clean rendering without chrome - for task description at top
 */
export type TimelineItemVariant = "activity" | "comment" | "description";

export interface TimelineItemWrapperProps {
  item: schema.taskTimelineWithActor;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  children?: React.ReactNode;
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  tasks?: schema.TaskWithLabels[];
  actionButtons?: React.ReactNode;
  // Inline editing props
  isEditing?: boolean;
  onContentChange?: (content: NodeJSON | undefined) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  /**
   * Controls the visual style of the timeline item
   * @default "activity"
   */
  variant?: TimelineItemVariant;
}

export interface GlobalTimelineProps {
  task: schema.TaskWithLabels;
  labels: schema.labelType[];
  availableUsers: schema.userType[];
  categories: schema.categoryType[];
  tasks: schema.TaskWithLabels[];
}

export interface TimelineItemProps {
  item: schema.taskTimelineWithActor;
  labels?: schema.labelType[];
  availableUsers?: schema.userType[];
  categories?: schema.categoryType[];
  tasks?: schema.TaskWithLabels[];
}

export interface ConsolidatedTimelineItemProps {
  consolidatedItem: ConsolidatedTimelineItem;
  labels: schema.labelType[];
  availableUsers: schema.userType[];
}

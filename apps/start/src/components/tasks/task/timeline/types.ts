import type { schema } from "@repo/database";

export type ConsolidatedTimelineItem = {
	id: string;
	actor: schema.taskTimelineWithActor["actor"];
	createdAt: Date;
	items: schema.taskTimelineWithActor[];
	eventTypes: string[];
};

export interface TimelineItemWrapperProps {
	item: schema.taskTimelineWithActor;
	icon: React.ComponentType<{ size?: number }>;
	color: string;
	children?: React.ReactNode;
	availableUsers?: schema.userType[];
	categories?: schema.categoryType[];
	tasks?: schema.TaskWithLabels[];
	outerChildren?: React.ReactNode;
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

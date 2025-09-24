import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Label } from "@repo/ui/components/label";
import {
	Timeline,
	TimelineContent,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@repo/ui/components/tomui/timeline";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTime, formatDateTimeFromNow } from "@repo/util";
import {
	IconArrowRight,
	IconEdit,
	IconMessageDots,
	IconPlus,
	IconTag,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";
import type { PartialBlock } from "node_modules/@blocknote/core/types/src/blocks/defaultBlocks";
import type React from "react";
import { Fragment } from "react";
import { priorityConfig, statusConfig } from "../../admin/organization/project/table/task-list-item";
import { Editor } from "../../blocknote/DynamicEditor";
import { RenderLabel } from "./label";

// Types for consolidated timeline items
type ConsolidatedTimelineItem = {
	id: string;
	actor: schema.taskTimelineWithActor["actor"];
	createdAt: Date;
	items: schema.taskTimelineWithActor[];
	eventTypes: string[];
};

// Consolidation logic
function consolidateTimelineItems(
	items: schema.taskTimelineWithActor[],
	timeWindowMinutes = 2
): (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] {
	if (!items.length) return [];

	const result: (schema.taskTimelineWithActor | ConsolidatedTimelineItem)[] = [];
	let currentGroup: schema.taskTimelineWithActor[] = [];
	let currentActor: string | null = null;
	let groupStartTime: Date | null = null;

	const flushCurrentGroup = () => {
		if (currentGroup.length === 0) return;

		// Never consolidate items with blockNote content
		const itemsWithBlockNote = currentGroup.filter((item) => item.blockNote);
		const itemsWithoutBlockNote = currentGroup.filter((item) => !item.blockNote);

		// Add items with blockNote individually
		itemsWithBlockNote.forEach((item) => result.push(item));

		// Consolidate items without blockNote if there are multiple similar events
		if (itemsWithoutBlockNote.length <= 1) {
			itemsWithoutBlockNote.forEach((item) => result.push(item));
		} else {
			const consolidatableTypes = ["label_added", "label_removed", "assignee_added", "assignee_removed"];
			const consolidatableItems = itemsWithoutBlockNote.filter((item) =>
				consolidatableTypes.includes(item.eventType)
			);
			const nonConsolidatableItems = itemsWithoutBlockNote.filter(
				(item) => !consolidatableTypes.includes(item.eventType)
			);

			// Add non-consolidatable items individually
			nonConsolidatableItems.forEach((item) => result.push(item));

			// Group consolidatable items
			if (consolidatableItems.length > 1) {
				const eventTypes = [...new Set(consolidatableItems.map((item) => item.eventType))];
				const firstItem = consolidatableItems[0];
				if (firstItem) {
					const consolidated: ConsolidatedTimelineItem = {
						id: `consolidated-${firstItem.id}`,
						actor: firstItem.actor,
						createdAt: firstItem.createdAt as Date,
						items: consolidatableItems,
						eventTypes,
					};
					result.push(consolidated);
				}
			} else {
				consolidatableItems.forEach((item) => result.push(item));
			}
		}

		currentGroup = [];
	};

	for (const item of items) {
		const itemTime = new Date(item.createdAt as Date);
		const itemActorId = item.actorId;

		// Check if this item should start a new group
		const shouldStartNewGroup =
			currentActor !== itemActorId ||
			!groupStartTime ||
			itemTime.getTime() - groupStartTime.getTime() > timeWindowMinutes * 60 * 1000;

		if (shouldStartNewGroup) {
			flushCurrentGroup();
			currentActor = itemActorId;
			groupStartTime = itemTime;
		}

		currentGroup.push(item);
	}

	// Flush the last group
	flushCurrentGroup();

	return result;
}

interface TimelineItemWrapperProps {
	item: schema.taskTimelineWithActor;
	icon: React.ComponentType<{ size?: number }>;
	color: string;
	children: React.ReactNode;
}

function TimelineItemWrapper({ item, icon: Icon, color, children }: TimelineItemWrapperProps) {
	return (
		<TimelineItem
			key={item.id}
			step={item.timelineNumber}
			className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-8"
		>
			<TimelineHeader>
				<TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
				<TimelineTitle className="mt-0.5">
					<Label
						variant={"heading"}
						className="text-sm font-normal leading-relaxed items-center flex flex-wrap gap-1"
					>
						{/* <RenderUser name={item.actor?.name || ""} image={item.actor?.image || ""} /> */}
						{children}{" "}
						<Tooltip>
							<TooltipTrigger className="text-sm">
								{formatDateTimeFromNow(item.createdAt as Date)}
							</TooltipTrigger>
							<TooltipContent>{formatDateTime(item.createdAt as Date)}</TooltipContent>
						</Tooltip>
					</Label>
				</TimelineTitle>
				<TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
					<Avatar className={cn("h-10 w-10 rounded-full", color)}>
						<AvatarFallback className="rounded-full bg-transparent">
							<Icon size={20} />
						</AvatarFallback>
					</Avatar>
				</TimelineIndicator>
			</TimelineHeader>
			{item.blockNote ? (
				<TimelineContent className="text-foreground mt-2 rounded-lg border px-4 py-3 bg-accent/50">
					<Editor readonly={true} value={item.blockNote as PartialBlock[]} />
				</TimelineContent>
			) : null}
		</TimelineItem>
	);
}

interface TimelineStatusChangeProps {
	item: schema.taskTimelineWithActor;
}

function TimelineStatusChange({ item }: TimelineStatusChangeProps) {
	const renderStatusChange = () => {
		if (!item.fromValue || !item.toValue) {
			return "changed the status";
		}

		// Parse JSON strings if needed
		const from = item.fromValue as string;
		const to = item.toValue as string;

		const fromConfig = statusConfig[from.replaceAll('"', "") as keyof typeof statusConfig];
		const toConfig = statusConfig[to.replaceAll('"', "") as keyof typeof statusConfig];

		return (
			<>
				<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the status
				from{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
					<span>{fromConfig?.label || from.replaceAll('"', "")}</span>
				</Badge>{" "}
				to{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
					<span>{toConfig?.label || to.replaceAll('"', "")}</span>
				</Badge>
			</>
		);
	};

	return (
		<TimelineItemWrapper item={item} icon={IconArrowRight} color="bg-accent text-primary-foreground">
			{renderStatusChange()}
		</TimelineItemWrapper>
	);
}

function TimelineCreated({ item }: { item: schema.taskTimelineWithActor }) {
	return (
		<TimelineItemWrapper item={item} icon={IconPlus} color="bg-accent text-primary-foreground">
			Created by <AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} />
		</TimelineItemWrapper>
	);
}

interface TimelinePriorityChangeProps {
	item: schema.taskTimelineWithActor;
}
function TimelinePriorityChange({ item }: TimelinePriorityChangeProps) {
	const renderPriorityChange = () => {
		if (!item.fromValue || !item.toValue) {
			return "changed the priority";
		}

		// Parse JSON strings if needed
		const from = item.fromValue as string;
		const to = item.toValue as string;

		const fromConfig = priorityConfig[from.replaceAll('"', "") as keyof typeof priorityConfig];
		const toConfig = priorityConfig[to.replaceAll('"', "") as keyof typeof priorityConfig];

		return (
			<>
				<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> changed the priority
				from{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
					<span>{fromConfig?.label || from.replaceAll('"', "")}</span>
				</Badge>{" "}
				to{" "}
				<Badge variant={"outline"} className="inline-flex items-center gap-1 justify-start">
					{toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
					<span>{toConfig?.label || to.replaceAll('"', "")}</span>
				</Badge>
			</>
		);
	};

	return (
		<TimelineItemWrapper item={item} icon={IconArrowRight} color="bg-primary text-primary-foreground items-end">
			{renderPriorityChange()}
		</TimelineItemWrapper>
	);
}

function TimelineComment({ item }: { item: schema.taskTimelineWithActor }) {
	return (
		<TimelineItemWrapper item={item} icon={IconMessageDots} color="bg-primary text-primary-foreground">
			commented
		</TimelineItemWrapper>
	);
}

function TimelineLabelAdded({ item, labels }: { item: schema.taskTimelineWithActor; labels: schema.labelType[] }) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-muted-foreground">
				added a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> added{" "}
			<RenderLabel label={label} className="inline-flex" />
		</TimelineItemWrapper>
	);
}

function TimelineLabelRemoved({ item, labels }: { item: schema.taskTimelineWithActor; labels: schema.labelType[] }) {
	const value = item.toValue as string;
	const label = labels.find((label) => label.id === value.replaceAll('"', ""));
	if (!label) {
		return (
			<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-muted-foreground">
				removed a label
			</TimelineItemWrapper>
		);
	}
	return (
		<TimelineItemWrapper item={item} icon={IconTag} color="bg-accent text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> removed label{" "}
			<RenderLabel label={label} className="inline-flex" />
		</TimelineItemWrapper>
	);
}

function TimelineAssigneeAdded({
	item,
	availableUsers,
}: {
	item: schema.taskTimelineWithActor;
	availableUsers: schema.userType[];
}) {
	const uesr = availableUsers.find((user) => user.id === item.toValue);
	return (
		<TimelineItemWrapper item={item} icon={IconUserPlus} color="bg-primary text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} />
			assigned
			<AvatarWithName name={uesr?.name || "Unknown"} image={uesr?.image || ""} />
		</TimelineItemWrapper>
	);
}

function TimelineAssigneeRemoved({
	item,
	availableUsers,
}: {
	item: schema.taskTimelineWithActor;
	availableUsers: schema.userType[];
}) {
	const uesr = availableUsers.find((user) => user.id === item.toValue);
	return (
		<TimelineItemWrapper item={item} icon={IconUserMinus} color="bg-primary text-primary-foreground">
			<AvatarWithName name={item.actor?.name || "Unknown"} image={item.actor?.image || ""} /> removed
			<AvatarWithName name={uesr?.name || "Unknown"} image={uesr?.image || ""} />
		</TimelineItemWrapper>
	);
}

function TimelineUpdated({ item }: { item: schema.taskTimelineWithActor }) {
	return (
		<TimelineItemWrapper item={item} icon={IconEdit} color="bg-primary text-primary-foreground">
			updated the task
		</TimelineItemWrapper>
	);
}

// Consolidated timeline components
function ConsolidatedTimelineLabels({
	consolidatedItem,
	labels,
}: {
	consolidatedItem: ConsolidatedTimelineItem;
	labels: schema.labelType[];
}) {
	const addedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_added")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value.replaceAll('"', "")))
		.filter(Boolean) as schema.labelType[];

	const removedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_removed")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value.replaceAll('"', "")))
		.filter(Boolean) as schema.labelType[];

	const renderContent = () => {
		return (
			<>
				<AvatarWithName
					name={consolidatedItem.actor?.name || "Unknown"}
					image={consolidatedItem.actor?.image || ""}
				/>
				{addedLabels.length > 0 && (
					<>
						{" added "}
						{addedLabels.map((label, index) => (
							<Fragment key={label.id}>
								<RenderLabel label={label} className="inline-flex" />
								{index < addedLabels.length - 1 && " "}
							</Fragment>
						))}
					</>
				)}
				{addedLabels.length > 0 && removedLabels.length > 0 && " and "}
				{removedLabels.length > 0 && (
					<>
						{" removed "}
						{removedLabels.map((label, index) => (
							<Fragment key={label.id}>
								<RenderLabel label={label} className="inline-flex" />
								{index < removedLabels.length - 1 && " "}
							</Fragment>
						))}
					</>
				)}
			</>
		);
	};

	// Create a mock timeline item for the wrapper
	const mockItem = {
		...consolidatedItem.items[0],
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as schema.taskTimelineWithActor;

	return (
		<TimelineItemWrapper item={mockItem} icon={IconTag} color="bg-accent text-primary-foreground">
			{renderContent()}
		</TimelineItemWrapper>
	);
}

function ConsolidatedTimelineAssignees({
	consolidatedItem,
	availableUsers,
}: {
	consolidatedItem: ConsolidatedTimelineItem;
	availableUsers: schema.userType[];
}) {
	const addedAssignees = consolidatedItem.items
		.filter((item) => item.eventType === "assignee_added")
		.map((item) => availableUsers.find((user) => user.id === item.toValue))
		.filter(Boolean) as schema.userType[];

	const removedAssignees = consolidatedItem.items
		.filter((item) => item.eventType === "assignee_removed")
		.map((item) => availableUsers.find((user) => user.id === item.toValue))
		.filter(Boolean) as schema.userType[];

	const renderContent = () => {
		return (
			<>
				<AvatarWithName
					name={consolidatedItem.actor?.name || "Unknown"}
					image={consolidatedItem.actor?.image || ""}
				/>
				{addedAssignees.length > 0 && (
					<>
						{" assigned "}
						{addedAssignees.map((user, index) => (
							<Fragment key={user.id}>
								<AvatarWithName name={user.name || "Unknown"} image={user.image || ""} />
								{index < addedAssignees.length - 1 && " "}
							</Fragment>
						))}
					</>
				)}
				{addedAssignees.length > 0 && removedAssignees.length > 0 && " and "}
				{removedAssignees.length > 0 && (
					<>
						{" removed "}
						{removedAssignees.map((user, index) => (
							<Fragment key={user.id}>
								<AvatarWithName name={user.name || "Unknown"} image={user.image || ""} />
								{index < removedAssignees.length - 1 && " "}
							</Fragment>
						))}
					</>
				)}
			</>
		);
	};

	// Create a mock timeline item for the wrapper
	const mockItem = {
		...consolidatedItem.items[0],
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as schema.taskTimelineWithActor;

	const icon = addedAssignees.length > 0 ? IconUserPlus : IconUserMinus;

	return (
		<TimelineItemWrapper item={mockItem} icon={icon} color="bg-primary text-primary-foreground">
			{renderContent()}
		</TimelineItemWrapper>
	);
}

function ConsolidatedTimelineItem({
	consolidatedItem,
	labels,
	availableUsers,
}: {
	consolidatedItem: ConsolidatedTimelineItem;
	labels: schema.labelType[];
	availableUsers: schema.userType[];
}) {
	const hasLabelEvents = consolidatedItem.eventTypes.some(
		(type) => type === "label_added" || type === "label_removed"
	);
	const hasAssigneeEvents = consolidatedItem.eventTypes.some(
		(type) => type === "assignee_added" || type === "assignee_removed"
	);

	// Prioritize label events if both exist
	if (hasLabelEvents) {
		return <ConsolidatedTimelineLabels consolidatedItem={consolidatedItem} labels={labels} />;
	}

	if (hasAssigneeEvents) {
		return <ConsolidatedTimelineAssignees consolidatedItem={consolidatedItem} availableUsers={availableUsers} />;
	}

	// Fallback - shouldn't happen with current logic, but render first item individually
	const firstItem = consolidatedItem.items[0];
	if (firstItem) {
		return <TimelineUpdated item={firstItem} />;
	}

	return null;
}

interface GlobalTimelineProps {
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
	availableUsers: schema.userType[];
}

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

export function AvatarWithName({ name, image }: { name: string; image: string }) {
	return (
		<Badge
			variant={"secondary"}
			className="inline-flex items-center gap-1 justify-center h-5 bg-accent border border-border"
		>
			<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
				<AvatarImage src={image || "/avatar.jpg"} alt={name} />
				<AvatarFallback className="rounded-full bg-transparent uppercase">{name.slice(0, 2)}</AvatarFallback>
			</Avatar>
			<span>{name}</span>
		</Badge>
	);
}

import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { getDisplayName } from "@repo/util";
import {
	IconArrowRight,
	IconEdit,
	IconFileDescription,
	IconLink,
	IconLinkOff,
	IconLockFilled,
	IconPencil,
	IconTag,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import { Fragment } from "react";
import { priorityConfig, statusConfig } from "../../shared/config";
import { InlineLabel } from "../../shared/inlinelabel";
import { TimelineItemWrapper } from "./base";
import { parseUpdatedField } from "./parse-updated-field";
import { parseRelationValue, TaskLink } from "./timeline-hierarchy";
import type { ConsolidatedTimelineItemProps } from "./types";

export function ConsolidatedTimelineLabels({
	consolidatedItem,
	labels,
	availableUsers,
	showSeparator = true,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "labels" | "availableUsers" | "showSeparator">) {
	const addedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_added")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value?.replaceAll('"', "")))
		.filter(Boolean) as (typeof labels)[number][];

	const removedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_removed")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value?.replaceAll('"', "")))
		.filter(Boolean) as (typeof labels)[number][];

	const renderContent = () => {
		return (
			<>
				<InlineLabel
					text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
					image={consolidatedItem.actor?.image || ""}
				/>
				{addedLabels.length > 0 && (
					<>
						{" added "}
						{addedLabels.map((label, index) => (
							<Fragment key={label.id + nanoid(5)}>
								{/*<RenderLabel label={label} className="inline-flex !bg-transparent" />*/}
								<InlineLabel
									text={label.name}
									icon={
										label.visible === "public" ? (
											<IconTag size={12} style={{ color: label.color || undefined }} />
										) : (
											<IconLockFilled size={12} style={{ color: label.color || undefined }} />
										)
									}
								/>
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
							<Fragment key={label.id + nanoid(5)}>
								<InlineLabel
									text={label.name}
									icon={
										label.visible === "public" ? (
											<IconTag size={12} style={{ color: label.color || undefined }} />
										) : (
											<IconLockFilled size={12} style={{ color: label.color || undefined }} />
										)
									}
								/>
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
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	return (
		<TimelineItemWrapper
			item={mockItem}
			availableUsers={availableUsers}
			icon={IconTag}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			{renderContent()}
		</TimelineItemWrapper>
	);
}

export function ConsolidatedTimelineAssignees({
	consolidatedItem,
	availableUsers,
	showSeparator = true,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "availableUsers" | "showSeparator">) {
	const addedAssignees = consolidatedItem.items
		.filter((item) => item.eventType === "assignee_added")
		.map((item) => availableUsers.find((user) => user.id === item.toValue))
		.filter(Boolean) as (typeof availableUsers)[number][];

	const removedAssignees = consolidatedItem.items
		.filter((item) => item.eventType === "assignee_removed")
		.map((item) => availableUsers.find((user) => user.id === item.toValue))
		.filter(Boolean) as (typeof availableUsers)[number][];

	const renderContent = () => {
		return (
			<>
				<InlineLabel
					text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
					image={consolidatedItem.actor?.image || ""}
				/>
				{addedAssignees.length > 0 && (
					<>
						{" assigned "}
						{addedAssignees.map((user, index) => (
							<Fragment key={user.id + nanoid(5)}>
								<InlineLabel text={getDisplayName(user)} image={user.image || ""} />
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
							<Fragment key={user.id + nanoid(5)}>
								<InlineLabel text={getDisplayName(user)} image={user.image || ""} />
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
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	const icon = addedAssignees.length > 0 ? IconUserPlus : IconUserMinus;

	return (
		<TimelineItemWrapper
			availableUsers={availableUsers}
			item={mockItem}
			icon={icon}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			{renderContent()}
		</TimelineItemWrapper>
	);
}

const UPDATED_FIELD_SUMMARY: Record<string, string> = {
	title: "changed the title",
	description: "updated the description",
	visible: "changed the visibility",
};

const UPDATED_FIELD_ICON: Record<string, typeof IconEdit> = {
	title: IconPencil,
	description: IconFileDescription,
};

export function ConsolidatedTimelineUpdates({
	consolidatedItem,
	showSeparator = true,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "showSeparator">) {
	const updatedItems = consolidatedItem.items.filter((item) => item.eventType === "updated");
	const fields = new Set(updatedItems.map((item) => parseUpdatedField(item.toValue)?.field).filter(Boolean));
	const dominantField = fields.size === 1 ? ([...fields][0] as string) : undefined;

	const mockItem = {
		...consolidatedItem.items[0],
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	return (
		<TimelineItemWrapper
			item={mockItem}
			icon={(dominantField && UPDATED_FIELD_ICON[dominantField]) || IconEdit}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			<InlineLabel
				text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
				image={consolidatedItem.actor?.image || ""}
			/>{" "}
			{dominantField ? UPDATED_FIELD_SUMMARY[dominantField] : `made ${updatedItems.length} updates`}
		</TimelineItemWrapper>
	);
}

/**
 * Renders a burst of status changes from the same actor as a single "changed the status from
 * X to Y" line showing the net first-to-last transition, matching the shape of the plain
 * `TimelineStatusChange` renderer. Intermediate hops (e.g. Backlog → Todo → In Progress) are
 * not enumerated. Renders nothing if the net transition is a no-op (churned back to the
 * original status) — there's nothing meaningful to report in that case.
 */
export function ConsolidatedTimelineStatusChanges({
	consolidatedItem,
	showSeparator = true,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "showSeparator">) {
	const statusItems = consolidatedItem.items.filter((item) => item.eventType === "status_change");
	const firstItem = statusItems[0];
	const lastItem = statusItems[statusItems.length - 1];
	if (!firstItem || !lastItem) return null;

	const from = typeof firstItem.fromValue === "string" ? firstItem.fromValue.replaceAll('"', "") : undefined;
	const to = typeof lastItem.toValue === "string" ? lastItem.toValue.replaceAll('"', "") : undefined;
	if (!from || !to || from === to) return null;

	const fromConfig = statusConfig[from as keyof typeof statusConfig];
	const toConfig = statusConfig[to as keyof typeof statusConfig];

	const mockItem = {
		...firstItem,
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	return (
		<TimelineItemWrapper
			item={mockItem}
			icon={IconArrowRight}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			<InlineLabel
				text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
				image={consolidatedItem.actor?.image || ""}
			/>{" "}
			changed the status from{" "}
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={fromConfig?.label || from}
				icon={fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
			/>{" "}
			to{" "}
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={toConfig?.label || to}
				icon={toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
			/>
		</TimelineItemWrapper>
	);
}

/**
 * Renders a burst of priority changes from the same actor as a single "changed the priority
 * from X to Y" line showing the net first-to-last transition — see
 * `ConsolidatedTimelineStatusChanges` for the equivalent status-change behavior.
 */
export function ConsolidatedTimelinePriorityChanges({
	consolidatedItem,
	showSeparator = true,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "showSeparator">) {
	const priorityItems = consolidatedItem.items.filter((item) => item.eventType === "priority_change");
	const firstItem = priorityItems[0];
	const lastItem = priorityItems[priorityItems.length - 1];
	if (!firstItem || !lastItem) return null;

	const from = typeof firstItem.fromValue === "string" ? firstItem.fromValue.replaceAll('"', "") : undefined;
	const to = typeof lastItem.toValue === "string" ? lastItem.toValue.replaceAll('"', "") : undefined;
	if (!from || !to || from === to) return null;

	const fromConfig = priorityConfig[from as keyof typeof priorityConfig];
	const toConfig = priorityConfig[to as keyof typeof priorityConfig];

	const mockItem = {
		...firstItem,
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	const PriorityIcon = toConfig?.icon
		? () => toConfig.icon(cn(toConfig.className, "h-4 w-4", to !== "urgent" && "fill-foreground"))
		: IconArrowRight;

	return (
		<TimelineItemWrapper
			item={mockItem}
			icon={PriorityIcon}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			<InlineLabel
				text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
				image={consolidatedItem.actor?.image || ""}
			/>{" "}
			changed the priority from{" "}
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={fromConfig?.label || from}
				icon={fromConfig?.icon(cn(fromConfig?.className, "h-3 w-3"))}
			/>{" "}
			to{" "}
			<InlineLabel
				className="text-muted-foreground hover:text-foreground"
				text={toConfig?.label || to}
				icon={toConfig?.icon(cn(toConfig?.className, "h-3 w-3"))}
			/>
		</TimelineItemWrapper>
	);
}

function resolveLinkedTask(
	entry: schema.taskTimelineWithActor,
	tasks: schema.TaskWithLabels[]
): schema.TaskWithLabels | undefined {
	switch (entry.eventType) {
		case "parent_added":
		case "subtask_added": {
			const id = typeof entry.toValue === "string" ? entry.toValue.replaceAll('"', "") : undefined;
			return id ? tasks.find((task) => task.id === id) : undefined;
		}
		case "parent_removed":
		case "subtask_removed": {
			const id = typeof entry.fromValue === "string" ? entry.fromValue.replaceAll('"', "") : undefined;
			return id ? tasks.find((task) => task.id === id) : undefined;
		}
		case "relation_added": {
			const relatedTaskId = parseRelationValue(entry.toValue)?.relatedTaskId;
			return relatedTaskId ? tasks.find((task) => task.id === relatedTaskId) : undefined;
		}
		default:
			return undefined;
	}
}

function LinkedTaskList({
	entries,
	tasks,
	organization,
}: {
	entries: schema.taskTimelineWithActor[];
	tasks: schema.TaskWithLabels[];
	organization?: ConsolidatedTimelineItemProps["organization"];
}) {
	return (
		<>
			{entries.map((entry, index) => {
				const task = resolveLinkedTask(entry, tasks);
				return (
					<Fragment key={entry.id}>
						{task ? (
							<TaskLink task={task} FallbackIcon={IconLink} organization={organization} />
						) : (
							<InlineLabel className="text-muted-foreground" text="a task" icon={<IconLink size={12} />} />
						)}
						{index < entries.length - 1 && " "}
					</Fragment>
				);
			})}
		</>
	);
}

const LINK_ADDED_TYPES: Record<string, true> = { parent_added: true, subtask_added: true, relation_added: true };
const LINK_REMOVED_TYPES: Record<string, true> = {
	parent_removed: true,
	subtask_removed: true,
	relation_removed: true,
};

export function ConsolidatedTimelineLinks({
	consolidatedItem,
	tasks = [],
	showSeparator = true,
	organization,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "tasks" | "showSeparator" | "organization">) {
	const addedLinks = consolidatedItem.items.filter((item) => LINK_ADDED_TYPES[item.eventType]);
	const removedLinks = consolidatedItem.items.filter((item) => LINK_REMOVED_TYPES[item.eventType]);

	const mockItem = {
		...consolidatedItem.items[0],
		id: consolidatedItem.id,
		createdAt: consolidatedItem.createdAt,
		actor: consolidatedItem.actor,
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	return (
		<TimelineItemWrapper
			item={mockItem}
			icon={addedLinks.length > 0 ? IconLink : IconLinkOff}
			color="bg-accent text-primary-foreground"
			showSeparator={showSeparator}
		>
			<InlineLabel
				text={consolidatedItem.actor ? getDisplayName(consolidatedItem.actor) : "Unknown"}
				image={consolidatedItem.actor?.image || ""}
			/>
			{addedLinks.length > 0 && (
				<>
					{" linked "}
					<LinkedTaskList entries={addedLinks} tasks={tasks} organization={organization} />
				</>
			)}
			{addedLinks.length > 0 && removedLinks.length > 0 && " and "}
			{removedLinks.length > 0 && (
				<>
					{" unlinked "}
					<LinkedTaskList entries={removedLinks} tasks={tasks} organization={organization} />
				</>
			)}
		</TimelineItemWrapper>
	);
}

export function ConsolidatedTimelineItem({
	consolidatedItem,
	labels,
	availableUsers,
	tasks,
	showSeparator = true,
	organization,
}: ConsolidatedTimelineItemProps) {
	const hasLabelEvents = consolidatedItem.eventTypes.some(
		(type) => type === "label_added" || type === "label_removed"
	);
	const hasAssigneeEvents = consolidatedItem.eventTypes.some(
		(type) => type === "assignee_added" || type === "assignee_removed"
	);
	const hasUpdatedEvents = consolidatedItem.eventTypes.some((type) => type === "updated");
	const hasStatusEvents = consolidatedItem.eventTypes.some((type) => type === "status_change");
	const hasPriorityEvents = consolidatedItem.eventTypes.some((type) => type === "priority_change");
	const hasLinkEvents = consolidatedItem.eventTypes.some((type) => LINK_ADDED_TYPES[type] || LINK_REMOVED_TYPES[type]);

	return (
		<>
			{/* 🔖 Labels */}
			{hasLabelEvents && (
				<ConsolidatedTimelineLabels
					availableUsers={availableUsers}
					consolidatedItem={consolidatedItem}
					labels={labels}
					showSeparator={showSeparator}
				/>
			)}

			{/* 👤 Assignees */}
			{hasAssigneeEvents && (
				<ConsolidatedTimelineAssignees
					consolidatedItem={consolidatedItem}
					availableUsers={availableUsers}
					showSeparator={showSeparator}
				/>
			)}

			{/* ✏️ Field updates (title / description / visibility) */}
			{hasUpdatedEvents && (
				<ConsolidatedTimelineUpdates consolidatedItem={consolidatedItem} showSeparator={showSeparator} />
			)}

			{/* 🔀 Status changes */}
			{hasStatusEvents && (
				<ConsolidatedTimelineStatusChanges consolidatedItem={consolidatedItem} showSeparator={showSeparator} />
			)}

			{/* 🚦 Priority changes */}
			{hasPriorityEvents && (
				<ConsolidatedTimelinePriorityChanges consolidatedItem={consolidatedItem} showSeparator={showSeparator} />
			)}

			{/* 🔗 Task links (parent / subtask / relation) */}
			{hasLinkEvents && (
				<ConsolidatedTimelineLinks
					consolidatedItem={consolidatedItem}
					tasks={tasks}
					showSeparator={showSeparator}
					organization={organization}
				/>
			)}
		</>
	);
}

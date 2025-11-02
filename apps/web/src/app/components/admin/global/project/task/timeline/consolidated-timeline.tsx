import { IconTag, IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import { nanoid } from "nanoid";
import { Fragment } from "react";
import { RenderLabel } from "../label";
import { AvatarWithName, TimelineItemWrapper } from "./base";
import { TimelineUpdated } from "./timeline-updated";
import type { ConsolidatedTimelineItemProps } from "./types";

export function ConsolidatedTimelineLabels({
	consolidatedItem,
	labels,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "labels">) {
	const addedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_added")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value.replaceAll('"', "")))
		.filter(Boolean) as (typeof labels)[number][];

	const removedLabels = consolidatedItem.items
		.filter((item) => item.eventType === "label_removed")
		.map((item) => item.toValue as string)
		.map((value) => labels.find((label) => label.id === value.replaceAll('"', "")))
		.filter(Boolean) as (typeof labels)[number][];

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
							<Fragment key={label.id + nanoid(5)}>
								<RenderLabel label={label} className="inline-flex !bg-transparent" />
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
								<RenderLabel label={label} className="inline-flex !bg-transparent" />
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
		<TimelineItemWrapper item={mockItem} icon={IconTag} color="bg-accent text-primary-foreground">
			{renderContent()}
		</TimelineItemWrapper>
	);
}

export function ConsolidatedTimelineAssignees({
	consolidatedItem,
	availableUsers,
}: Pick<ConsolidatedTimelineItemProps, "consolidatedItem" | "availableUsers">) {
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
				<AvatarWithName
					name={consolidatedItem.actor?.name || "Unknown"}
					image={consolidatedItem.actor?.image || ""}
				/>
				{addedAssignees.length > 0 && (
					<>
						{" assigned "}
						{addedAssignees.map((user, index) => (
							<Fragment key={user.id + nanoid(5)}>
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
							<Fragment key={user.id + nanoid(5)}>
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
	} as Parameters<typeof TimelineItemWrapper>[0]["item"];

	const icon = addedAssignees.length > 0 ? IconUserPlus : IconUserMinus;

	return (
		<TimelineItemWrapper item={mockItem} icon={icon} color="bg-accent text-primary-foreground">
			{renderContent()}
		</TimelineItemWrapper>
	);
}

export function ConsolidatedTimelineItem({ consolidatedItem, labels, availableUsers }: ConsolidatedTimelineItemProps) {
	const hasLabelEvents = consolidatedItem.eventTypes.some(
		(type) => type === "label_added" || type === "label_removed"
	);
	const hasAssigneeEvents = consolidatedItem.eventTypes.some(
		(type) => type === "assignee_added" || type === "assignee_removed"
	);

	const firstItem = consolidatedItem.items[0];
	const hasOtherEvents = !hasLabelEvents && !hasAssigneeEvents && !!firstItem;

	return (
		<>
			{/* 🔖 Labels */}
			{hasLabelEvents && <ConsolidatedTimelineLabels consolidatedItem={consolidatedItem} labels={labels} />}

			{/* 👤 Assignees */}
			{hasAssigneeEvents && (
				<ConsolidatedTimelineAssignees consolidatedItem={consolidatedItem} availableUsers={availableUsers} />
			)}

			{/* 🧩 Fallback */}
			{hasOtherEvents && <TimelineUpdated item={firstItem} />}
		</>
	);
}

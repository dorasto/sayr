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
import { cn } from "@repo/ui/lib/utils";
import { formatDateTime, getHslaWithOpacity } from "@repo/util";
import {
	IconArrowRight,
	IconCircleFilled,
	IconEdit,
	IconFlag,
	IconMessageDots,
	IconPlus,
	IconTag,
	IconTagsOff,
	IconUserMinus,
	IconUserPlus,
} from "@tabler/icons-react";
import type { PartialBlock } from "node_modules/@blocknote/core/types/src/blocks/defaultBlocks";
import { priorityConfig, statusConfig } from "../../admin/organization/project/table/task-list-item";
import { Editor } from "../../blocknote/DynamicEditor";
import RenderUser from "./render-user";

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
					<Label variant={"heading"} className="text-sm font-normal leading-relaxed">
						{/* <RenderUser name={item.actor?.name || ""} image={item.actor?.image || ""} /> */}
						{children} on {formatDateTime(item.createdAt as Date)}
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
				<TimelineContent className="text-foreground mt-2 rounded-lg border px-4 py-3">
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
				<Badge variant={"outline"} className="inline-flex items-center gap-1 px-1 pr-2 justify-start">
					<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
						<AvatarImage src={item.actor?.image || "/avatar.jpg"} alt={item.actor?.name} />
						<AvatarFallback className="rounded-full bg-transparent uppercase">
							{item.actor?.name.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<span>{item.actor?.name}</span>
				</Badge>{" "}
				changed the status from{" "}
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
			created a task
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
				<Badge variant={"outline"} className="inline-flex items-center gap-1 px-1 pr-2 justify-start">
					<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
						<AvatarImage src={item.actor?.image || "/avatar.jpg"} alt={item.actor?.name} />
						<AvatarFallback className="rounded-full bg-transparent uppercase">
							{item.actor?.name.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
					<span>{item.actor?.name}</span>
				</Badge>{" "}
				changed the priority from{" "}
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
			<Badge variant={"outline"} className="inline-flex items-center gap-1 px-1 pr-2 justify-start">
				<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
					<AvatarImage src={item.actor?.image || "/avatar.jpg"} alt={item.actor?.name} />
					<AvatarFallback className="rounded-full bg-transparent uppercase">
						{item.actor?.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
				<span>{item.actor?.name}</span>
			</Badge>{" "}
			added label{" "}
			<Badge
				key={label.id}
				variant="secondary"
				className="items-center gap-1 text-xs h-5 border border-border rounded"
				style={{
					backgroundColor: label.color ? getHslaWithOpacity(label.color, 0.1) : "var(--muted)",
					borderColor: label.color ? getHslaWithOpacity(label.color, 0.5) : "var(--border)",
				}}
			>
				<IconCircleFilled
					className="h-3 w-3"
					style={{
						color: label.color || "var(--foreground)",
					}}
				/>
				<span className="truncate">{label.name}</span>
			</Badge>
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
			<Badge variant={"outline"} className="inline-flex items-center gap-1 px-1 pr-2 justify-start">
				<Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
					<AvatarImage src={item.actor?.image || "/avatar.jpg"} alt={item.actor?.name} />
					<AvatarFallback className="rounded-full bg-transparent uppercase">
						{item.actor?.name.slice(0, 2)}
					</AvatarFallback>
				</Avatar>
				<span>{item.actor?.name}</span>
			</Badge>{" "}
			removed label{" "}
			<Badge
				key={label.id}
				variant="secondary"
				className="items-center gap-1 text-xs h-5 border border-border rounded"
				style={{
					backgroundColor: label.color ? getHslaWithOpacity(label.color, 0.1) : "var(--muted)",
					borderColor: label.color ? getHslaWithOpacity(label.color, 0.5) : "var(--border)",
				}}
			>
				<IconCircleFilled
					className="h-3 w-3"
					style={{
						color: label.color || "var(--foreground)",
					}}
				/>
				<span className="truncate">{label.name}</span>
			</Badge>
		</TimelineItemWrapper>
	);
}

function TimelineAssigneeAdded({ item }: { item: schema.taskTimelineWithActor }) {
	return (
		<TimelineItemWrapper item={item} icon={IconUserPlus} color="bg-primary text-primary-foreground">
			assigned a user
		</TimelineItemWrapper>
	);
}

function TimelineAssigneeRemoved({ item }: { item: schema.taskTimelineWithActor }) {
	return (
		<TimelineItemWrapper item={item} icon={IconUserMinus} color="bg-primary text-primary-foreground">
			unassigned a user
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

interface GlobalTimelineProps {
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
}

export default function GlobalTimeline({ task, labels }: GlobalTimelineProps) {
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

	return (
		<Timeline>
			{task.timeline?.map((item) => {
				const TimelineComponent = timelineComponents[item.eventType as keyof typeof timelineComponents];

				if (!TimelineComponent) {
					return null;
				}

				return <TimelineComponent key={item.id} item={item} labels={labels} />;
			})}
		</Timeline>
	);
}

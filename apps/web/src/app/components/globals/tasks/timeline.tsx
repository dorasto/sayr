import type { schema } from "@repo/database";
import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
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
import { formatDateTime } from "@repo/util";
import {
	IconArrowRight,
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
import { Editor } from "../../blocknote/DynamicEditor";
import RenderUser from "./render-user";

interface GlobalTimelineProps {
	task: schema.TaskWithLabels;
}
export default function GlobalTimeline({ task }: GlobalTimelineProps) {
	const itemTypes = {
		created: {
			label: "created a task",
			action: "created",
			icon: IconPlus,
			color: "bg-primary text-primary-foreground",
		},
		status_change: {
			label: "changed the status",
			action: "status_change",
			icon: IconArrowRight,
			color: "bg-primary text-primary-foreground",
		},
		priority_change: {
			label: "changed the priority",
			action: "priority_change",
			icon: IconFlag,
			color: "bg-primary text-primary-foreground",
		},
		comment: {
			label: "commented",
			action: "comment",
			icon: IconMessageDots,
			color: "bg-primary text-primary-foreground",
		},
		label_added: {
			label: "added a label",
			action: "label_added",
			icon: IconTag,
			color: "bg-accent text-muted-foreground",
		},
		label_removed: {
			label: "removed a label",
			action: "label_removed",
			icon: IconTagsOff,
			color: "bg-primary text-primary-foreground",
		},
		assignee_added: {
			label: "assigned a user",
			action: "assignee_added",
			icon: IconUserPlus,
			color: "bg-primary text-primary-foreground",
		},
		assignee_removed: {
			label: "unassigned a user",
			action: "assignee_removed",
			icon: IconUserMinus,
			color: "bg-primary text-primary-foreground",
		},
		updated: {
			label: "updated the task",
			action: "updated",
			icon: IconEdit,
			color: "bg-primary text-primary-foreground",
		},
	};
	return (
		<Timeline>
			{task.timeline?.map((item) => {
				const itemType = itemTypes[item.eventType as keyof typeof itemTypes];
				const IconComponent = itemType.icon;
				return (
					<TimelineItem
						key={item.id}
						step={item.timelineNumber}
						className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-8"
					>
						<TimelineHeader>
							<TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
							<TimelineTitle className="mt-0.5 flex items-center gap-1">
								<RenderUser task={task} />{" "}
								<Label variant={"heading"} className="text-sm font-normal">
									<span>{itemType.label}</span> on {formatDateTime(item.createdAt as Date)}
								</Label>
							</TimelineTitle>
							<TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
								<Avatar className={cn("h-10 w-10 rounded-full", itemType.color)}>
									<AvatarFallback className="rounded-full bg-transparent">
										<IconComponent size={20} />
									</AvatarFallback>
								</Avatar>
							</TimelineIndicator>
						</TimelineHeader>
						{/* {item.comment ? (
						<TimelineContent className="text-foreground mt-2 rounded-lg border px-4 py-3">
							<Editor readonly={true} value={item.description as PartialBlock[]} />
						</TimelineContent>
					) : null} */}
					</TimelineItem>
				);
			})}
		</Timeline>
	);
}
